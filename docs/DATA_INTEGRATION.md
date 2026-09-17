# Copper Atlas — Data Integration Specification

> 全球铜矿床图谱 — 数据集成规范
> Version: 1.0 · 2026-07-04
> **Principle**: One record added = one point on the map. Zero frontend code changes.

---

## Part I — Unified Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      COPPER ATLAS DATA PIPELINE                      │
└──────────────────────────────────────────────────────────────────────┘

STEP  INPUT                        PROCESS                          OUTPUT
────  ──────────────────────────── ──────────────────────────────── ──────────────────────

 1    CSV / Excel / GeoJSON        Importer                         Raw dict / Python list
      Shapefile / GeoPackage       Reads file, detects format,
                                   parses into structured records.

 ↓

 2    Raw dict (in-memory)         Validator                        Validated records
                                  Checks coordinates, duplicates,   + ErrorReport
                                  country existence, type validity,
                                  unit consistency.

 ↓

 3    Validated records            Normalizer                       Normalized records
                                  Maps external field names to      (canonical field names)
                                  canonical names (e.g. "lat"→
                                  "latitude", "Res ton"→
                                  "tonnage_mt"). Converts units.

 ↓

 4    Normalized records           PostgreSQL INSERT                Row in deposits table
                                  SQLAlchemy ORM → asyncpg →       + PostGIS GEOMETRY
                                  PostGIS. location = Point(lon,lat)
                                  in EPSG:4326.

 ↓

 5    Row in deposits table        PostgREST / API Route            GeoJSON FeatureCollection
                                  fetch from Supabase, join
                                  countries + deposit_classification,
                                  merge into properties object.

 ↓

 6    GeoJSON FeatureCollection    TanStack Query (useDeposits)     Cached GeoJSON in browser
                                  HTTP GET /api/v1/deposits
                                  cacheKey = [bbox, filters]
                                  staleTime = 30s

 ↓

 7    GeoJSON in browser           MapLibre GL JS                   WebGL circle on map
                                  map.getSource().setData(data)
                                  cluster → circle layers
                                  size by tonnage, color by type

 ↓

 8    WebGL circle                 User click event                 Deposit detail panel
                                  e.features[0].properties.id →
                                  selectDeposit(id) →
                                  useDepositDetail(id)

 ──── ──────────────────────────── ──────────────────────────────── ──────────────────────

 END-TO-END LATENCY:  < 2 seconds from CSV import to map display
 CORRECTNESS CHECK:  24 deposits → 24 circles on map → 24 clickable detail panels
```

### Data Format at Each Step

| Step | Format | Example |
|------|--------|---------|
| 1 CSV | Flat rows with headers | `name_en,country,latitude,longitude,...` |
| 2 Raw dict | Python dict, keys as-is from file | `{"name_en":"Escondida","lat":-24.267,...}` |
| 3 Validated | Same dict, error-free | `{"name_en":"Escondida","latitude":-24.267,...}` |
| 4 Normalized | Canonical field names | `{"name":"Escondida","location":"POINT(-69.067 -24.267)",...}` |
| 5 PostgreSQL | Row in deposits table | `SELECT * FROM deposits WHERE slug='escondida'` |
| 6 GeoJSON API | FeatureCollection JSON | `{"type":"FeatureCollection","features":[...]}` |
| 7 MapLibre Source | In-memory GeoJSON | `map.getSource(id).setData(geojson)` |
| 8 Properties | JavaScript object (flat) | `feature.properties.name === "Escondida"` |

---

## Part II — Unified Field Naming Convention

### Canonical Field Names — THE SINGLE SOURCE OF TRUTH

Every field has ONE name across all layers. No aliases, no abbreviations.

```
DATABASE (snake_case)      API GeoJSON (same)         FRONTEND TypeScript (same)
─────────────────────────  ─────────────────────────  ─────────────────────────
id                         id                         id: string
slug                       slug                       slug: string
name                       name                       name: string
name_zh                    name_zh                    name_zh: string | null
primary_mineral            primary_mineral            primary_mineral: string
secondary_minerals         secondary_minerals         secondary_minerals: string[] | null
status                     status                     status: DepositStatus
tonnage_mt                 tonnage_mt                 tonnage_mt: number | null
tonnage_grade_pct          tonnage_grade_pct          tonnage_grade_pct: number | null
tonnage_confidence         tonnage_confidence         tonnage_confidence: string | null
discovery_year             discovery_year             discovery_year: number | null
operator_company           operator_company           operator_company: string | null
mining_method              mining_method              mining_method: string | null
host_rock_type             host_rock_type             host_rock_type: string | null
host_rock_age_text         host_rock_age_text         host_rock_age_text: string | null
tectonic_setting           tectonic_setting           tectonic_setting: string | null
geological_province        geological_province        geological_province: string | null
metallogenic_belt          metallogenic_belt          metallogenic_belt: string | null
summary_en                 summary_en                 summary_en: string | null
summary_zh                 summary_zh                 summary_zh: string | null
data_source                data_source                data_source: string | null
data_quality_score         data_quality_score         data_quality_score: number | null
is_featured                is_featured                is_featured: boolean
tags                       tags                       tags: string[] | null
is_public                  is_public                  is_public: boolean
is_active                  is_active                  is_active: boolean
deposit_classification_id  deposit_classification_id  (internal, not exposed)

-- JOINED FIELDS (not stored in deposits table) --
country_id →               country_iso                country_iso: string | null
                            country_name_en            country_name_en: string | null
                            country_name_zh            country_name_zh: string | null
deposit_classification_id→ deposit_type_code          deposit_type_code: string | null
                            deposit_type_name_en       deposit_type_name_en: string | null
                            deposit_type_name_zh       deposit_type_name_zh: string | null
                            deposit_type_path          deposit_type_path: string | null

-- SPATIAL (special handling) --
location (GEOMETRY)         geometry.coordinates      geometry.coordinates: [lng, lat]
                            geometry.type              geometry.type: "Point"
```

### Forbidden Aliases

```
DO NOT USE:              USE INSTEAD:
───────────────────────  ────────────────────
lat, latitude_raw        latitude ← but actually: location in PostGIS
lng, lon, long, x, y     longitude ← but actually: location in PostGIS
country, country_name    country_name_en  or  country_iso
type, depositType        deposit_type_name_en  or  deposit_type_code
commodity, mineral       primary_mineral
grade, avgGrade, Cu%     tonnage_grade_pct
reserve, tonnage, size   tonnage_mt
status_text, opStatus    status
discYear                 discovery_year
operator, company        operator_company
province, region         state_province
```

### Naming Convention

1. Database: `snake_case` (PostgreSQL convention)
2. API GeoJSON properties: `snake_case` (same as DB — NO transformation)
3. Frontend TypeScript: `snake_case` (same as API — NO transformation)
4. **PRINCIPLE**: Field name is identical in all three layers. If `tonnage_mt` in DB, it must be `tonnage_mt` in GeoJSON, it must be `tonnage_mt` in TypeScript.

---

## Part III — GeoJSON Standard

### FeatureCollection Response (List)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "c119125b-1d73-41a3-ab36-98525d8b6083",
      "geometry": {
        "type": "Point",
        "coordinates": [-68.900, -22.300]
      },
      "properties": {
        "id": "c119125b-1d73-41a3-ab36-98525d8b6083",
        "name": "Chuquicamata",
        "name_zh": "丘基卡马塔",
        "slug": "chuquicamata",
        "primary_mineral": "copper",
        "secondary_minerals": ["molybdenum", "gold", "silver"],
        "status": "production",
        "tonnage_mt": 98.0,
        "tonnage_grade_pct": 0.55,
        "tonnage_confidence": "NI43-101",
        "discovery_year": 1899,
        "operator_company": "Codelco",
        "mining_method": "open_pit",
        "host_rock_age_text": "Eocene-Oligocene",
        "tectonic_setting": "Continental arc",
        "geological_province": "Central Andes",
        "data_quality_score": 5,
        "is_featured": true,
        "data_source": "Codelco annual reports; Sillitoe (2010)",
        "tags": ["giant", "porphyry", "open-pit"],
        "country_iso": "CL",
        "country_name_en": "Chile",
        "country_name_zh": "智利",
        "deposit_type_code": "POR_CUMO",
        "deposit_type_name_en": "Porphyry Cu-Mo",
        "deposit_type_name_zh": "斑岩铜钼型",
        "deposit_type_path": "por.cumo"
      }
    }
  ],
  "meta": {
    "total": 24,
    "page": 1,
    "size": 200,
    "pages": 1
  }
}
```

### Feature Response (Single Detail)

```json
{
  "type": "Feature",
  "id": "c119125b-1d73-41a3-ab36-98525d8b6083",
  "geometry": {
    "type": "Point",
    "coordinates": [-68.900, -22.300]
  },
  "properties": {
    "id": "c119125b-1d73-41a3-ab36-98525d8b6083",
    "name": "Chuquicamata",
    "name_zh": "丘基卡马塔",
    "slug": "chuquicamata",

    "... (all list fields above) ...",

    "alternative_names": null,
    "tonnage_mt_low": 85.0,
    "tonnage_mt_high": 110.0,
    "tonnage_cutoff_pct": 0.30,
    "proven_mt": 45.0,
    "probable_mt": 30.0,
    "measured_mt": 60.0,
    "indicated_mt": 20.0,
    "inferred_mt": 18.0,
    "production_start_year": 1915,
    "production_end_year": null,
    "owner_companies": ["Codelco"],
    "mineralization_age_ma": 35.0,
    "mineralization_age_error_ma": 2.0,
    "mineralization_age_method": "U-Pb_zircon",
    "host_rock_type": "Granodiorite porphyry",
    "metallogenic_belt": "Andean Porphyry Belt",
    "summary_en": "Chuquicamata is the world's largest...",
    "summary_zh": "丘基卡马塔是全球最大的...",
    "reference_dois": ["10.2113/gsecongeo.105.1.3"],
    "data_source_url": "https://...",
    "last_verified_date": "2024-01-15",
    "images": ["https://..."],
    "documents": ["https://..."],
    "properties": {
      "supergene_enrichment": true,
      "oxide_zone_depth_m": 150
    }
  }
}
```

### GeoJSON Rules

1. **Geometry**: Always `{"type":"Point","coordinates":[longitude,latitude]}` (GeoJSON standard order: lng first, lat second)
2. **Properties**: Flat object, no nesting (except `properties` JSONB field). Joined data (country, classification) is denormalized into properties.
3. **ID**: Feature.id = Feature.properties.id = database deposits.id (UUID string)
4. **Null handling**: absent data = `null`, not omitted. Frontend checks for `null`.
5. **Numbers**: `tonnage_mt` and `tonnage_grade_pct` are JavaScript numbers (float). No string-encoded numbers.
6. **Meta**: Always present with `total`, `page`, `size`, `pages`. Enables frontend pagination.

---

## Part IV — CSV Template

### Official Import Template: `copper_atlas_import_template.csv`

```csv
id,name_en,name_zh,country_iso,state_province,latitude,longitude,primary_mineral,secondary_minerals,deposit_type_code,tonnage_mt,tonnage_grade_pct,tonnage_confidence,status,discovery_year,production_start_year,operator_company,mining_method,host_rock_type,host_rock_age_text,tectonic_setting,geological_province,metallogenic_belt,summary_en,summary_zh,data_source,data_quality_score,is_featured,tags,last_updated
NEW,Chuquicamata,丘基卡马塔,CL,Antofagasta,-22.300,-68.900,copper,"molybdenum;gold;silver",POR_CUMO,98.0,0.55,NI43-101,production,1899,1915,Codelco,open_pit,Granodiorite porphyry,Eocene-Oligocene,Continental arc,Central Andes,,Chuquicamata is the world's largest open-pit copper mine.,丘基卡马塔是全球最大的露天铜矿。,Codelco annual reports; Sillitoe (2010),5,yes,"giant;porphyry;open-pit",2026-07-04
NEW,Escondida,,CL,Antofagasta,-24.267,-69.067,copper,"gold;silver;molybdenum",POR_CUMO,130.0,0.55,JORC,production,1981,1990,BHP,open_pit,,Late Eocene-Early Oligocene,Continental arc,,,Escondida is the world's largest copper producer by output.,,BHP annual reports,5,yes,"giant;porphyry;supergene",2026-07-04
```

### CSV Column Specification

| Column | Required | Type | Example | Notes |
|--------|----------|------|---------|-------|
| `id` | No | UUID or NEW | `NEW` | "NEW" = auto-generate UUID |
| `name_en` | **Yes** | String | `Chuquicamata` | Primary name |
| `name_zh` | No | String | `丘基卡马塔` | Chinese name |
| `country_iso` | **Yes** | ISO 3166-1 alpha-2 | `CL` | Must exist in `countries` table |
| `state_province` | No | String | `Antofagasta` | |
| `latitude` | **Yes** | Float [-90,90] | `-22.300` | WGS84 |
| `longitude` | **Yes** | Float [-180,180] | `-68.900` | WGS84 |
| `primary_mineral` | **Yes** | String | `copper` | Must exist in `mineral_i18n` |
| `secondary_minerals` | No | Semicolon-separated | `gold;silver` | Use `;` as delimiter |
| `deposit_type_code` | **Yes** | String | `POR_CUMO` | Must exist in `deposit_classification.code` |
| `tonnage_mt` | No | Float | `98.0` | Million metric tonnes |
| `tonnage_grade_pct` | No | Float | `0.55` | Percent (0-100) |
| `tonnage_confidence` | No | String | `JORC` | `JORC`/`NI43-101`/`CRIRSCO`/`historical` |
| `status` | No | String | `production` | `production`/`development`/`exploration`/`feasibility`/`suspended`/`closed`/`depleted`/`unknown` |
| `discovery_year` | No | Integer | `1899` | |
| `production_start_year` | No | Integer | `1915` | |
| `operator_company` | No | String | `Codelco` | |
| `mining_method` | No | String | `open_pit` | |
| `host_rock_type` | No | String | `Granodiorite` | |
| `host_rock_age_text` | No | String | `Eocene-Oligocene` | Free-text fallback |
| `tectonic_setting` | No | String | `Continental arc` | |
| `geological_province` | No | String | `Central Andes` | |
| `metallogenic_belt` | No | String | `Andean Cu Belt` | |
| `summary_en` | No | String | `...` | English description |
| `summary_zh` | No | String | `...` | Chinese description |
| `data_source` | No | String | `USGS MRDS` | |
| `data_quality_score` | No | Integer [1-5] | `5` | 1=unverified, 5=peer-reviewed |
| `is_featured` | No | Boolean | `yes` | `yes`/`no`/`true`/`false` |
| `tags` | No | Semicolon-separated | `giant;porphyry` | Use `;` as delimiter |
| `last_updated` | No | Date | `2026-07-04` | YYYY-MM-DD |

### CSV Rules

1. **Columns with commas** (arrays, descriptions) MUST be wrapped in double quotes: `"gold;silver;molybdenum"`
2. **Semicolons** are array delimiters for `secondary_minerals` and `tags`
3. **Empty cells** are treated as NULL (not empty string)
4. **id=NEW** generates a new UUID automatically
5. **File encoding**: UTF-8 (required for Chinese characters)
6. **Header row** MUST be present and match exactly

---

## Part V — Data Validation

### Validation Pipeline

```
CSV row
  │
  ├─ CHECK 1: Required fields ─── name_en, country_iso, latitude, longitude,
  │                                primary_mineral, deposit_type_code
  │                                → FAIL: reject row, log error
  │
  ├─ CHECK 2: Coordinate validity ─── latitude ∈ [-90, 90]
  │                                     longitude ∈ [-180, 180]
  │                                     → FAIL: reject row, log "Invalid coordinates"
  │
  ├─ CHECK 3: Coordinate sanity ─── not (0,0), not in ocean (future)
  │                                  → WARN: flag for human review
  │
  ├─ CHECK 4: Duplicate detection ─── slug = slugify(name_en) must be unique
  │                                    same (name, country) = possible duplicate
  │                                    → FAIL: reject row if slug collision
  │
  ├─ CHECK 5: Country existence ─── country_iso must exist in countries table
  │                                   → FAIL: reject row, log "Unknown country: XX"
  │
  ├─ CHECK 6: Deposit type validity ─── deposit_type_code must exist in
  │                                      deposit_classification table
  │                                      → FAIL: reject row, log "Unknown type: XXX"
  │
  ├─ CHECK 7: Mineral validity ─── primary_mineral must exist in mineral_i18n
  │                                  → FAIL: reject row, log "Unknown mineral: XXX"
  │
  ├─ CHECK 8: Status validity ─── status ∈ {production,development,exploration,
  │                               feasibility,suspended,closed,depleted,unknown}
  │                               → WARN: auto-set to "unknown" if invalid
  │
  ├─ CHECK 9: Numeric ranges ─── tonnage_mt > 0, tonnage_grade_pct ∈ (0, 100]
  │                               discovery_year ∈ [1800, current_year]
  │                               → WARN: flag outlier values
  │
  ├─ CHECK 10: Unit consistency ─── tonnage_mt always in million metric tonnes
  │                                  grade always in percent (not permille, not g/t)
  │                                  → FAIL: reject if unit mismatch detected
  │
  └─ RESULT: row passes → proceed to normalization
              row fails  → append to error_report.csv, skip row
```

### Error Report Format (`import_errors_YYYYMMDD_HHMMSS.csv`)

```csv
row_number,field,error_code,message,value
3,country_iso,UNKNOWN_COUNTRY,Country code not found in database,XX
7,latitude,INVALID_COORD,Latitude out of range [-90,90],-95.5
12,deposit_type_code,UNKNOWN_TYPE,Deposit classification code not found,FAKE_TYPE
15,slug,DUPLICATE_SLUG,Slug already exists,chuquicamata
20,tonnage_mt,UNIT_SUSPICIOUS,Possible wrong unit (values > 1000 may indicate tonnes not Mt),50000.0
```

---

## Part VI — Importer

### Supported Formats

| Format | Extension | Library | Method |
|--------|-----------|---------|--------|
| CSV | `.csv` | Python `csv` | Standard reader |
| Excel | `.xlsx` `.xls` | `openpyxl` | `load_workbook()` |
| GeoJSON | `.geojson` `.json` | `json` | Parse, extract features |
| Shapefile | `.shp` | `fiona` | `fiona.open()` → GeoJSON |
| GeoPackage | `.gpkg` | `fiona` | `fiona.open()` → GeoJSON |

### Importer Architecture

```python
# scripts/import_deposits.py

class DepositImporter:
    """Universal importer for all supported formats."""

    SUPPORTED_FORMATS = {
        '.csv':       self._import_csv,
        '.xlsx':      self._import_excel,
        '.xls':       self._import_excel,
        '.geojson':   self._import_geojson,
        '.json':      self._import_geojson,
        '.shp':       self._import_shapefile,
        '.gpkg':      self._import_shapefile,
    }

    def import_file(self, path: Path) -> ImportResult:
        """
        1. Detect format by extension
        2. Dispatch to format-specific parser
        3. Parse into list[dict] with raw field names
        4. Validate each record (see Part V)
        5. Normalize field names (see field mapping below)
        6. Batch INSERT into PostgreSQL
        7. Return ImportResult with counts + errors
        """
```

### Field Mapping (External → Canonical)

```python
FIELD_MAP = {
    # Canonical name     # Accepted external names (case-insensitive)
    "name":              ["name_en", "name", "deposit_name", "site_name"],
    "name_zh":           ["name_zh", "name_cn", "chinese_name"],
    "country_iso":       ["country_iso", "country", "iso_code", "country_code"],
    "latitude":          ["latitude", "lat"],
    "longitude":         ["longitude", "lon", "lng", "long"],
    "primary_mineral":   ["primary_mineral", "commodity", "mineral"],
    "deposit_type_code": ["deposit_type_code", "deposit_type", "type"],
    "tonnage_mt":        ["tonnage_mt", "tonnage", "reserve", "reserve_mt",
                          "contained_metal", "resource"],
    "tonnage_grade_pct": ["tonnage_grade_pct", "grade", "grade_pct", "cu_pct"],
    "status":            ["status", "operational_status", "op_status"],
    "data_quality_score":["data_quality_score", "quality", "confidence"],
}
```

### Shapefile Special Handling

```python
# Shapefiles have a .dbf attribute table. Each row becomes one record.
# Geometry column is automatically Point(lon, lat) via fiona.
# Attribute columns are mapped via FIELD_MAP.
# CRS is read from .prj file; if not WGS84, coordinates are reprojected.
```

---

## Part VII — API Contract

### The Single Source of Truth

The API GeoJSON response IS the contract. All layers must conform to it.

```
┌─────────────────────────────────────────────────────────┐
│                   API CONTRACT                          │
│                                                         │
│  GET /api/v1/deposits                                   │
│  Response: GeoJSON FeatureCollection                    │
│  Properties: {name, slug, tonnage_mt, country_iso, ...} │
│                                                         │
│  THIS IS THE ONLY ALLOWED DATA SHAPE.                   │
│  Database writes → produce this shape.                  │
│  Frontend reads   → consume this shape.                 │
│  Any new field    → added here first, then everywhere.   │
└─────────────────────────────────────────────────────────┘
```

### Contract Enforcement

**Rule 1 — Add-field procedure**:
1. Add column to `deposits` table (Alembic migration)
2. Add field to `Deposit` SQLAlchemy model
3. Add field to `GET /api/v1/deposits` GeoJSON properties
4. Add field to `DepositProperties` TypeScript interface
5. Frontend component reads it from `feature.properties.<field>`

**Rule 2 — Forbidden patterns**:
```typescript
// ❌ NEVER: frontend queries database directly
const db = createClient(...); db.from('deposits').select('*');

// ❌ NEVER: frontend uses different field name
feature.properties.reserve  // when database column is tonnage_mt

// ❌ NEVER: API skips normalization
return rows;  // raw PostgREST output, fields not mapped

// ✅ ALWAYS: frontend queries API
const { data } = useQuery({ queryKey: ['deposits'], queryFn: () => apiFetch('/deposits') });

// ✅ ALWAYS: same field name everywhere
feature.properties.tonnage_mt === deposit.tonnage_mt === deposits.tonnage_mt
```

**Rule 3 — TypeScript must mirror API**:
```typescript
// packages/shared-types/src/deposit.ts (generated from OpenAPI spec)
// OR: apps/web/src/types/deposit.ts (hand-maintained mirror)

export interface DepositProperties {
  name: string;                    // matches API: properties.name
  tonnage_mt: number | null;       // matches API: properties.tonnage_mt
  country_iso: string | null;      // matches API: properties.country_iso
  // ... every API property has exactly one TypeScript type
}
```

### OpenAPI Generation (Future)

```
FastAPI app → /openapi.json → openapi-typescript → TypeScript types
                                              ↓
                                    Replaces manual types/deposit.ts
```

---

## Part VIII — Automated Test

### Integration Test Pipeline

```
TEST: import_and_display
─────────────────────────────────────────────────────────

STEP 1: Import CSV
  python scripts/import_deposits.py test_fixtures/new_deposit.csv
  EXPECT: 1 row imported, 0 errors

STEP 2: Database verification
  SELECT COUNT(*) FROM deposits WHERE slug = 'test-import-deposit'
  EXPECT: 1

STEP 3: API GeoJSON response
  GET /api/v1/deposits?search=test-import-deposit
  EXPECT: HTTP 200, features.length === 1
  EXPECT: features[0].geometry.type === "Point"
  EXPECT: features[0].properties.name === "Test Import Deposit"
  EXPECT: features[0].properties.tonnage_mt === 5.0

STEP 4: Map source data
  map.getSource('copper-deposits-geojson')._data.features
  EXPECT: contains feature with id = test deposit UUID

STEP 5: Detail panel
  map.fire('click', { features: [{ properties: { id: test_uuid } }] })
  EXPECT: detailPanel contains "Test Import Deposit"
  EXPECT: detailPanel contains "5.0 Mt"

STEP 6: Search
  Type "Test Import" in search field
  EXPECT: SearchPanel shows "Test Import Deposit" in results

STEP 7: Filter
  Set status filter = "exploration"
  EXPECT: test deposit visible (status = exploration)
  Set country filter = "CL"
  EXPECT: test deposit NOT visible (country = TS)

STEP 8: i18n
  Switch to Chinese
  EXPECT: detail panel shows Chinese name if set

CLEANUP:
  DELETE FROM deposits WHERE slug = 'test-import-deposit'
```

### Test Implementation (`e2e/data-integration.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Data Integration — CSV to Map', () => {
  test('imported deposit appears on map', async ({ page }) => {
    // Step 1: API returns the imported deposit
    const response = await page.request.get('/api/v1/deposits?search=chuquicamata');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.features.length).toBeGreaterThan(0);

    // Step 2: Check GeoJSON structure
    const feature = data.features[0];
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toHaveLength(2);
    expect(feature.properties.name).toBeTruthy();
    expect(feature.properties.country_iso).toBeTruthy();

    // Step 3: Deposit has all required properties
    const requiredProps = [
      'name', 'slug', 'primary_mineral', 'status',
      'country_iso', 'deposit_type_code'
    ];
    for (const prop of requiredProps) {
      expect(feature.properties[prop]).toBeDefined();
    }
  });

  test('all 24 deposits have valid coordinates', async ({ page }) => {
    const response = await page.request.get('/api/v1/deposits?size=200');
    const data = await response.json();

    for (const feature of data.features) {
      const [lng, lat] = feature.geometry.coordinates;
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).not.toBe(0);  // Should not be at Null Island
    }
  });

  test('search finds expected deposit', async ({ page }) => {
    const response = await page.request.get('/api/v1/deposits?search=Olympic');
    const data = await response.json();
    expect(data.features.some((f: any) =>
      f.properties.name.includes('Olympic')
    )).toBeTruthy();
  });

  test('country filter works', async ({ page }) => {
    const response = await page.request.get('/api/v1/deposits?country=CL');
    const data = await response.json();
    expect(data.features.every((f: any) =>
      f.properties.country_iso === 'CL'
    )).toBeTruthy();
  });

  test('status filter works', async ({ page }) => {
    const response = await page.request.get('/api/v1/deposits?status=development');
    const data = await response.json();
    expect(data.features.every((f: any) =>
      f.properties.status === 'development'
    )).toBeTruthy();
  });
});
```

---

## Part IX — Development Discipline

### The Golden Rule

> **Any new deposit field must exist identically in all four layers:
> Database → API → TypeScript → Map. Adding a field means updating all four.
> No exceptions.**

### Four-Layer Checklist for Adding a Field

```
Adding: "annual_production_tonnes"

□ 1. DATABASE — Alembic migration
     ALTER TABLE deposits ADD COLUMN annual_production_tonnes NUMERIC(12,3);

□ 2. SQLALCHEMY MODEL — apps/api/src/models/deposit.py
     annual_production_tonnes: Mapped[Optional[float]] = mapped_column(Numeric(12,3))

□ 3. API ROUTE — apps/web/src/app/api/v1/deposits/route.ts
     Add "annual_production_tonnes" to GeoJSON properties object

□ 4. TYPESCRIPT — apps/web/src/types/deposit.ts
     annual_production_tonnes: number | null

□ 5. COMPONENT (if displayed) — e.g. DepositDetailPanel.tsx
     <DetailRow label="Annual Production" value={props.annual_production_tonnes} />

□ 6. CSV IMPORTER — scripts/import_deposits.py
     FIELD_MAP["annual_production_tonnes"] = ["annual_production_tonnes", "annual_prod"]

□ 7. VALIDATOR — validate_data() function
     Add range check: annual_production_tonnes > 0

□ 8. TEST — Add assertions in test_data_integration.py
     Verify field is present in GeoJSON response
```

### Banned Practices

| Banned | Reason | Correct Approach |
|--------|--------|------------------|
| Direct DB access from frontend | Bypasses API normalization | Always use `/api/v1/deposits` |
| `feature.properties.reserve` | Field name mismatch with DB | Always `tonnage_mt` |
| `lat` or `lng` | Inconsistent naming | Always use `location` (GEOMETRY) or `coordinates` (GeoJSON) |
| `select *` without column list | Schema changes break API | Explicit column list in queries |
| Adding field only to frontend | DB doesn't have it | Start from database, propagate upward |
| Adding field only to database | Frontend can't see it | Complete all 4 layers |
| Hardcoding data in components | Won't update with new imports | Read from `feature.properties` |

### Code Review Gate

Every PR must answer:

1. ✅ Does this change add/remove/modify a data field?
2. ✅ If yes: is the field present in all four layers?
3. ✅ Are field names identical (case, spelling, separators) across layers?
4. ✅ Is the API GeoJSON response shape unchanged except for the new field?
5. ✅ Does the CSV importer handle the new field?
6. ✅ Is there a test verifying the field flows end-to-end?

### Single Change Point Principle

```
Wrong:
  database:  column "tonnage"
  API:       { "tonnage_mt": ... }
  frontend:  feature.properties.reserve

  → Three different names for one concept. Nightmare to maintain.

Correct:
  database:  column "tonnage_mt"
  API:       { "tonnage_mt": ... }
  frontend:  feature.properties.tonnage_mt

  → One name. One concept. Change once.
```

---

## Appendix A — Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `exploration` | 勘探 | Active exploration, no resource defined yet |
| `feasibility` | 可行性研究 | Feasibility study underway |
| `development` | 开发建设 | Mine under construction |
| `production` | 生产中 | Active mining operation |
| `suspended` | 暂停 | Operations temporarily halted |
| `closed` | 已关闭 | Mine permanently closed |
| `depleted` | 已采尽 | Resources exhausted |
| `unknown` | 未知 | Status not documented |

## Appendix B — Deposit Classification Codes

See `data/seeds/01_deposit_classification.sql` for the complete hierarchy. Top-level codes:

| Code | Name | Description |
|------|------|-------------|
| `POR` | Porphyry | Magmatic-hydrothermal, ~60% global Cu |
| `POR_CUMO` | Porphyry Cu-Mo | Calc-alkaline, continental arcs |
| `POR_CUAU` | Porphyry Cu-Au | Alkaline, island arcs |
| `SED` | Sediment-hosted | Stratabound, Kupferschiefer type |
| `SED_SSC` | Sed. Stratiform Cu | Reduced-facies |
| `VMS` | Volcanogenic Massive Sulfide | Seafloor hydrothermal |
| `IOCG` | Iron Oxide Copper Gold | Fe-oxide-rich |
| `IOCG_HEM` | IOCG Hematite | Olympic Dam type |
| `SKN` | Skarn | Carbonate-intrusive contact |
| `SKN_CALC` | Calcic Skarn | Limestone-hosted |
| `EPI` | Epithermal | Shallow, low-T |
| `EPI_HS` | High Sulfidation | Acid-sulfate type |
| `MAG` | Magmatic Sulfide | Ni-Cu-PGE, mafic-ultramafic |

## Appendix C — Reporting Standards

| Code | Full Name | Jurisdiction |
|------|-----------|-------------|
| `JORC` | Joint Ore Reserves Committee | Australia |
| `NI43-101` | National Instrument 43-101 | Canada |
| `CRIRSCO` | Committee for Mineral Reserves | International |
| `PERC` | Pan-European Reserves Committee | Europe |
| `SAMREC` | South African Mineral Resource Committee | South Africa |
| `historical` | Historical estimate | Pre-dates modern codes |

## Appendix D — Verification Checklist

Before declaring any data import "successful", verify ALL items:

```
□ CSV file can be read and parsed
□ Each row passes validation (no errors in error report)
□ Each row inserts into PostgreSQL deposits table
□ Each row has a valid PostGIS POINT geometry
□ GET /api/v1/deposits returns the new deposits
□ GeoJSON FeatureCollection contains the correct number of features
□ Each feature has type: "Feature", geometry.type: "Point"
□ geometry.coordinates is [longitude, latitude] (correct order)
□ properties matches the CSV input values
□ Opening /en/map shows the new deposits as circles on the map
□ Deposit circles are colored by deposit type
□ Clicking a deposit opens the detail panel
□ Detail panel shows all available fields
□ Search finds the new deposit by name
□ Country filter includes the new deposit
□ Status filter correctly includes/excludes the new deposit
□ Tonnage slider filter correctly includes/excludes
□ Chinese name displays when locale is zh
□ Chinese interface strings display correctly
□ NO frontend code was modified (if the field already existed in the schema)
```
