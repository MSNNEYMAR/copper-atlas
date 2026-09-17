# Copper Atlas — Data Pipeline

> 全球铜矿床图谱 — 数据工程管道
> Version 2.0 · Phase 2 Data-First

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COPPER ATLAS DATA PIPELINE                          │
│                                                                         │
│  SOURCES                                                                │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐          │
│  │   CSV    │ │ Excel  │ │ GeoJSON  │ │  SHP  │ │  PDF/API │          │
│  └────┬─────┘ └───┬────┘ └────┬─────┘ └───┬───┘ └────┬─────┘          │
│       │            │           │            │           │               │
│       └────────────┴───────────┴────────────┴───────────┘               │
│                            │                                            │
│                    ┌───────▼────────┐                                   │
│                    │  1. INGEST     │  Format detection & parsing       │
│                    │                │  CSV/Excel/GeoJSON/SHP/GPKG/PDF   │
│                    └───────┬────────┘                                   │
│                            │  list[RawRecord]                           │
│                    ┌───────▼────────┐                                   │
│                    │  2. CLEAN      │  Remove whitespace, fix encoding  │
│                    │                │  Handle BOM, normalize Unicode     │
│                    └───────┬────────┘                                   │
│                            │  list[CleanedRecord]                       │
│                    ┌───────▼────────┐                                   │
│                    │  3. NORMALIZE  │  Map external fields → canonical  │
│                    │                │  Convert units, fix coordinates   │
│                    └───────┬────────┘                                   │
│                            │  list[NormalizedRecord]                    │
│                    ┌───────▼────────┐                                   │
│                    │  4. VALIDATE   │  10 validation checks             │
│                    │                │  Generate error report             │
│                    └───────┬────────┘                                   │
│                            │  list[ValidatedRecord] + ErrorReport       │
│                    ┌───────▼────────┐                                   │
│                    │  5. DEDUP      │  Fuzzy name + coordinate match    │
│                    │                │  Flag possible duplicates          │
│                    └───────┬────────┘                                   │
│                            │  list[UniqueRecord] + DuplicateReport      │
│                    ┌───────▼────────┐                                   │
│                    │  6. ENRICH     │  AI summary, keywords, embedding  │
│                    │  (optional)    │  Cross-reference external IDs      │
│                    └───────┬────────┘                                   │
│                            │  list[EnrichedRecord]                      │
│                    ┌───────▼────────┐                                   │
│                    │  7. REVIEW     │  Human review queue               │
│                    │                │  Approve / reject / edit          │
│                    └───────┬────────┘                                   │
│                            │  list[ApprovedRecord]                      │
│                    ┌───────▼────────┐                                   │
│                    │  8. LOAD       │  PostgreSQL INSERT                │
│                    │                │  Update materialized views         │
│                    └───────┬────────┘                                   │
│                            │  rows in deposits table                    │
│                    ┌───────▼────────┐                                   │
│                    │  9. VERIFY     │  API smoke test                   │
│                    │                │  Map display check                │
│                    └────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1 — Ingest

### Supported Formats

| Format | Extension | Parser | Notes |
|--------|-----------|--------|-------|
| CSV | `.csv` | Python `csv.DictReader` | UTF-8, comma-delimited |
| TSV | `.tsv` | Python `csv.DictReader` | Tab-delimited |
| Excel | `.xlsx` | `openpyxl` | First sheet only |
| GeoJSON | `.geojson` `.json` | `json.load()` | Extract `features[].properties` |
| Shapefile | `.shp` | `fiona` → GeoJSON → properties | Requires `.dbf` `.shx` `.prj` |
| GeoPackage | `.gpkg` | `fiona` | Single layer |
| PDF (report) | `.pdf` | `pdfplumber` + LLM | Experimental — extract tables |
| API | URL | `requests` | USGS, Mindat, Wikidata |

### Format Auto-Detection

```python
def detect_format(filepath: Path) -> str:
    ext = filepath.suffix.lower()
    if ext == '.csv':   return 'csv'
    if ext == '.tsv':   return 'tsv'
    if ext in ('.xlsx', '.xls'): return 'excel'
    if ext in ('.geojson', '.json'):
        with open(filepath) as f:
            data = json.load(f)
            if data.get('type') == 'FeatureCollection':
                return 'geojson'
        return 'json'
    if ext == '.shp':   return 'shapefile'
    if ext == '.gpkg':  return 'geopackage'
    raise UnsupportedFormatError(f"Unknown format: {ext}")
```

---

## Stage 2 — Clean

### Operations
1. **Strip BOM** (`﻿`) — common in Windows-saved CSV
2. **Trim whitespace** — all string fields
3. **Normalize Unicode** — NFC normalization (combining characters)
4. **Fix encoding** — detect and convert from GBK, Shift-JIS, Latin-1 to UTF-8
5. **Remove empty rows** — rows with all NULL/empty values
6. **Standardize booleans** — `yes`/`no`/`Y`/`N`/`1`/`0`/`true`/`false` → Python `bool`
7. **Standardize nulls** — `N/A`, `-`, `--`, `?`, `null`, `none`, `unknown` → Python `None`

---

## Stage 3 — Normalize

### Field Mapping Engine

```python
FIELD_MAP = {
    # (canonical, accepted_inputs)
    ("name",         ["name_en", "name", "deposit_name", "site", "deposit"]),
    ("name_zh",      ["name_zh", "name_cn", "chinese_name"]),
    ("country_iso",  ["country_iso", "country", "iso", "country_code"]),
    ("latitude",     ["latitude", "lat"]),          # ⚠️ WGS84 only
    ("longitude",    ["longitude", "lon", "lng", "long", "x"]),
    ("primary_mineral", ["primary_mineral", "commodity", "mineral"]),
    ("tonnage_mt",   ["tonnage_mt", "tonnage", "reserve", "contained_metal"]),
    ("tonnage_grade_pct", ["tonnage_grade_pct", "grade", "grade_pct"]),
    ("status",       ["status", "operational_status", "op_status"]),
    ("data_source",  ["data_source", "source", "reference"]),
    # ... full list in DATA_STANDARD.md Part X
}

def normalize(record: dict) -> dict:
    result = {}
    for canonical, aliases in FIELD_MAP:
        for alias in aliases:
            if alias in record:
                result[canonical] = record[alias]
                break
    return result
```

### Unit Conversion Engine

```python
UNIT_CONVERSIONS = {
    # Detects suspicious values and flags them
    "tonnage_mt": {
        "detect_unit": lambda v: "tonnes" if v > 10000 else "mt",
        "convert": lambda v, unit: v / 1_000_000 if unit == "tonnes" else v,
        "flag_if": lambda v: v > 10000,  # Probably in tonnes, not Mt
    },
    "tonnage_grade_pct": {
        "detect_unit": lambda v: "permille" if v > 100 else "percent",
        "convert": lambda v, unit: v / 10 if unit == "permille" else v,
        "flag_if": lambda v: v > 100,
    },
}
```

### Coordinate Normalization
- **Degrees-minutes-seconds** → Decimal degrees: `22°18'S` → `-22.3`
- **UTM** → WGS84: Use `pyproj` with stored zone
- **Swap detection**: if |lat| > 90, swap lat/lng (common error)

---

## Stage 4 — Validate

See DATA_INTEGRATION.md Part V for complete validation checklist (10 checks).

Key validation rules:
1. Required fields present
2. Coordinates in range
3. No duplicate slugs
4. Country exists in DB
5. Deposit type exists in DB
6. Mineral exists in DB
7. Numeric ranges valid
8. Unit consistency
9. Date format valid
10. Coordinate not (0,0)

---

## Stage 5 — Deduplicate

### Strategy

```
1. EXACT MATCH: same slug → REJECT
2. NAME MATCH: Levenshtein distance < 3 on normalized name
3. COORDINATE MATCH: distance < 1km between two deposits
4. NAME + COUNTRY match → FLAG for human review
5. NAME + COORDINATE match → HIGH PROBABILITY duplicate
```

### Output
`duplicate_report.csv`: `deposit_a_slug, deposit_b_slug, match_type, similarity_score, action`

---

## Stage 6 — Enrich (AI-assisted, optional)

### LLM Pipeline (human-in-the-loop)

```
Paper PDF/DOI
    │
    ├→ Extract text (pdfplumber)
    ├→ Chunk into sections (abstract, geology, resources)
    ├→ GPT-4o prompt: "Summarize the geology of [Deposit Name] in 150 words"
    ├→ GPT-4o prompt: "Extract: deposit type, host rock, mineralization age, tonnage, grade"
    ├→ Validate extracted values against manual entry
    ├→ Generate embedding (text-embedding-3-small, 1536d)
    └→ Store in ai_analyses table with human_reviewed = false
```

### Cross-Reference
- Lookup USGS MRDS ID → store in external_identifier
- Lookup Mindat ID → store in external_identifier
- Lookup Wikidata Q-ID → store in external_identifier

---

## Stage 7 — Review (Manual)

### Review Queue

```
AUTO-APPROVE (skip review):
  - data_quality_score >= 4
  - coordinates in valid range
  - no duplicate detected
  - source is Tier 1 (government survey, NI43-101)

FLAG FOR REVIEW:
  - data_quality_score <= 2
  - coordinate within 1km of existing deposit
  - coordinates in ocean (possible error)
  - unit suspected (tonnage > 10000)
  - AI confidence < 0.7
```

### Review Interface (Future)
- Side-by-side: import data vs. existing data
- One-click: Approve / Reject / Edit
- Edit fields inline
- Add reviewer notes

---

## Stage 8 — Load

### Batch INSERT Strategy

```sql
-- Use ON CONFLICT for upsert
INSERT INTO deposits (slug, name, country_id, location, ...)
VALUES (...), (...), (...)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    tonnage_mt = EXCLUDED.tonnage_mt,
    updated_at = NOW(),
    updated_by = 'data_pipeline'
WHERE deposits.tonnage_mt IS DISTINCT FROM EXCLUDED.tonnage_mt
   OR deposits.name IS DISTINCT FROM EXCLUDED.name;
```

### Materialized Views (for API performance)
```sql
CREATE MATERIALIZED VIEW mv_deposit_summary AS
SELECT d.*, c.iso_code, c.name_en as country_name_en, dc.code as deposit_type_code
FROM deposits d
JOIN countries c ON d.country_id = c.id
JOIN deposit_classification dc ON d.deposit_classification_id = dc.id
WHERE d.is_active = true;
```

---

## Stage 9 — Verify

### Smoke Test (automatic after every import)

```python
def verify_import(count: int) -> bool:
    # 1. API returns expected count
    resp = requests.get(f"{API_URL}/deposits?size=1")
    assert resp.json()["meta"]["total"] >= count

    # 2. All deposits have valid GeoJSON
    resp = requests.get(f"{API_URL}/deposits?size=500")
    for f in resp.json()["features"]:
        assert f["type"] == "Feature"
        assert f["geometry"]["type"] == "Point"
        assert len(f["geometry"]["coordinates"]) == 2

    # 3. Search works
    resp = requests.get(f"{API_URL}/search?q=copper")
    assert len(resp.json()) > 0

    # 4. Statistics return
    resp = requests.get(f"{API_URL}/statistics/summary")
    assert resp.json()["total_deposits"] >= count

    return True
```

---

## Source-Specific Pipelines

### USGS MRDS Import
```
USGS MRDS CSV (copper subset)
  → Filter: commodity ilike '%copper%'
  → Map fields: dep_id→external_id, site_name→name, latitude→lat, longitude→lon
  → Normalize: deposit type (USGS codes → our classification)
  → Enrich: add USGS ref URL
  → Load with data_quality_score=4 (government source)
```

### Company NI 43-101 Report Import
```
PDF Report
  → pdfplumber extract tables
  → GPT-4o extract: deposit name, tonnage, grade, cutoff, method
  → Human review (critical — resource estimates have legal significance)
  → Load with data_quality_score=5 (official report)
  → Store PDF URL in documents array
  → Store DOI in reference_dois array
```

### Academic Paper Import
```
DOI → CrossRef API → paper metadata
  → Store in papers table
  → Link to deposit via deposit_papers
  → GPT-4o extract geological description
  → Human review the AI summary
  → Load AI summary with human_reviewed flag
```
