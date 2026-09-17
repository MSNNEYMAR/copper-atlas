# Copper Atlas — Universal Importer System

> 全球铜矿床图谱 — 统一数据导入系统
> Version 2.0 · Phase 4 Data Expansion

---

## Pipeline

```
CSV / Excel / GeoJSON / Shapefile / GeoPackage / API
                    │
            ┌───────▼────────┐
            │ 1. DETECT       │  Format auto-detection by extension + magic bytes
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │ 2. PARSE        │  Format-specific parser (csv/xlsx/geojson/fiona)
            └───────┬────────┘
                    │  list[RawRecord]
            ┌───────▼────────┐
            │ 3. VALIDATE     │  Required fields, coord range, country exists, type exists
            └───────┬────────┘
                    │  list[ValidRecord] + error_report.csv
            ┌───────▼────────┐
            │ 4. NORMALIZE    │  Field mapping, unit conversion, slug generation
            └───────┬────────┘
                    │  list[NormalizedRecord]
            ┌───────▼────────┐
            │ 5. DEDUP        │  Slug collision → skip or upsert
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │ 6. LOAD         │  Supabase SQL API → INSERT ON CONFLICT
            └───────┬────────┘
                    │  rows in deposits table
            ┌───────▼────────┐
            │ 7. VERIFY       │  Count check, coordinate check, API check
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │ 8. MAP REFRESH  │  Auto — API returns new data immediately
            └────────────────┘
```

---

## Usage

```bash
# Single file
python scripts/import_universal.py deposits.csv

# Directory (all supported files)
python scripts/import_universal.py data/raw/chile/

# URL
python scripts/import_universal.py --url https://mrdata.usgs.gov/mrds/mrds-cu.csv

# Dry run (validate only, no insert)
python scripts/import_universal.py --dry-run deposits.csv

# Force update (overwrite existing)
python scripts/import_universal.py --upsert deposits.csv
```

---

## FIELD_MAP (external → canonical)

```python
FIELD_MAP = {
    "name":      ["name_en", "name", "deposit_name", "site_name", "deposit", "SITE_NAME", "Name"],
    "name_zh":   ["name_zh", "name_cn", "chinese_name", "Chinese_Name"],
    "country_iso":["country_iso","country","iso_code","COUNTRY","Country_Code"],
    "latitude":  ["latitude","lat","LATITUDE","LAT","y"],
    "longitude": ["longitude","lon","lng","long","LONGITUDE","LON","x"],
    "primary_mineral": ["primary_mineral","commodity","COMMODITY","Commodity"],
    "deposit_type_code": ["deposit_type_code","deposit_type","DEVTYPE","Type"],
    "tonnage_mt": ["tonnage_mt","tonnage","reserve","TONNAGE","Reserve","contained_metal"],
    "tonnage_grade_pct": ["tonnage_grade_pct","grade","GRADE","Grade","grade_pct"],
    "status":    ["status","STATUS","devstat","oper_status","DEVSTAT"],
    "discovery_year":["discovery_year","disc_year","DISCYR"],
    "operator_company":["operator_company","operator","OPERATOR","company"],
    "mining_method":["mining_method","METHOD","method"],
    "host_rock_type":["host_rock_type","HOSTROCK","host_rock"],
    "host_rock_age_text":["host_rock_age_text","AGE","host_rock_age"],
    "tectonic_setting":["tectonic_setting","TECTONIC","tectonic"],
    "geological_province":["geological_province","PROVINCE","province"],
    "data_source":["data_source","source","SOURCE","REF"],
    "data_quality_score":["data_quality_score","quality","QUALITY"],
    "summary_en": ["summary_en","description","DESCRIP","remarks"],
}
```

---

## Validation Rules

| # | Rule | Action |
|---|------|--------|
| 1 | name_en not empty | REJECT |
| 2 | country_iso exists in countries table | REJECT if missing |
| 3 | latitude in [-90,90], longitude in [-180,180] | REJECT if out of range |
| 4 | lat,lng ≠ (0,0) | REJECT (null island) |
| 5 | deposit_type_code in classification table | WARN, set to 'OTH' |
| 6 | primary_mineral in mineral_i18n | WARN, set to 'copper' |
| 7 | slug unique | REJECT if collision and not --upsert |
| 8 | tonnage_mt > 0 | WARN |
| 9 | tonnage_grade_pct in (0,100] | WARN |

---

## Auto-Generated Log

After every import, `import_log_YYYYMMDD_HHMMSS.json` is written:

```json
{
  "timestamp": "2026-07-04T12:00:00Z",
  "source": "usgs_mrds_cu_subset.csv",
  "total_rows": 487,
  "imported": 450,
  "skipped_duplicates": 25,
  "rejected": 12,
  "rejected_rows": "import_errors_20260704_120000.csv",
  "new_countries_added": 3,
  "deposits_before": 102,
  "deposits_after": 552
}
```

---

## Auto-Sync Guarantee

```
Database INSERT
  → API GET /api/v1/deposits returns new row
  → MapContainer fetch() gets updated GeoJSON
  → source.setData() updates map
  → Search index (in-memory) rebuilt on page refresh
  → Filter/detail panel reads from same API

NO FRONTEND CODE CHANGES REQUIRED.
```
