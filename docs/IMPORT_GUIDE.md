# Copper Atlas — Data Import Guide

> 全球铜矿床图谱 — 数据导入指南
> Version 1.0 · 2026-07-04

---

## Quick Start

### Import a CSV in 30 seconds

```bash
# 1. Prepare your CSV with the template headers
cp docs/templates/import_template.csv my_deposits.csv

# 2. Fill in your deposit data

# 3. Run the importer
python scripts/import_deposits.py my_deposits.csv

# 4. Check the results
# Success: "24 deposits imported, 0 errors"
# Errors: see import_errors_*.csv for details

# 5. Verify on the map
open https://copper-atlas-map.vercel.app/en/map
```

---

## Supported Formats

### CSV (Recommended)
```
Usage: python scripts/import_deposits.py deposits.csv
Encoding: UTF-8 (required)
Delimiter: comma (,)
Quote character: double quote (")
Header row: required (first row)
```

### Excel
```
Usage: python scripts/import_deposits.py deposits.xlsx
Sheets: first sheet only
Header row: required (row 1)
```

### GeoJSON
```
Usage: python scripts/import_deposits.py deposits.geojson
Structure: FeatureCollection with Point geometry
Properties: map to canonical fields (see FIELD_MAP)
```

### Shapefile
```
Usage: python scripts/import_deposits.py deposits.shp
Required files: .shp + .dbf + .shx + .prj (all four in same directory)
CRS: auto-detected from .prj, reprojected to WGS84 if needed
```

### GeoPackage
```
Usage: python scripts/import_deposits.py deposits.gpkg
Layer: first layer only
```

### Multiple files
```bash
python scripts/import_deposits.py chile.csv peru.csv usgs_copper.geojson
```

---

## CSV Column Reference

### Required columns (record rejected if missing)

| Column | Example | Notes |
|--------|---------|-------|
| `name_en` | `Chuquicamata` | Primary name in English |
| `country_iso` | `CL` | 2-letter ISO 3166-1 alpha-2 code |
| `latitude` | `-22.300` | WGS84 decimal degrees |
| `longitude` | `-68.900` | WGS84 decimal degrees |
| `primary_mineral` | `copper` | Must be in mineral registry |
| `deposit_type_code` | `POR_CUMO` | Must be in classification table |

### Optional columns (recommended for data quality)

| Column | Example | Notes |
|--------|---------|-------|
| `name_zh` | `丘基卡马塔` | Chinese name |
| `tonnage_mt` | `98.0` | Million metric tonnes |
| `tonnage_grade_pct` | `0.55` | Percent (not permille) |
| `status` | `production` | See status codes |
| `data_source` | `USGS MRDS` | Where the data came from |
| `data_quality_score` | `4` | 1-5, see scoring guide |

Full list: see DATA_STANDARD.md Part I.

---

## Before You Import — Checklist

```
□ File is UTF-8 encoded (not GBK, not Latin-1)
□ Header row is present and matches template
□ Latitude/longitude are decimal degrees, not DMS
□ Coordinates are in WGS84 (not CGCS2000, not NAD83)
□ Tonnage is in million metric tonnes (Mt), not tonnes, not short tons
□ Grade is in percent (%), not permille, not g/t
□ Country codes are ISO 3166-1 alpha-2 (2 letters)
□ Deposit type code exists in deposit_classification table
□ Mineral code exists in mineral_i18n table
□ No duplicate names in the same country
□ Every record has a data_source value
□ Array columns use semicolons (;) not commas as delimiter
```

---

## Common Errors & Fixes

### Error: "UNKNOWN_COUNTRY: Country code not found"
```
Fix: Use 2-letter ISO code. Check: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
CL = Chile, PE = Peru, CN = China, US = United States
```

### Error: "INVALID_COORD: Latitude out of range"
```
Fix: Latitude must be between -90 and 90. Common mistake: swapped lat/lng.
-22.3, -68.9 = correct (Chile)
-68.9, -22.3 = wrong (lat is out of range)
```

### Error: "UNKNOWN_TYPE: Deposit classification code not found"
```
Fix: Use valid codes from the classification hierarchy.
Top-level: POR, SED, VMS, IOCG, SKN, EPI, MAG, OTH
Sub-types: POR_CUMO, POR_CUAU, SED_SSC, IOCG_HEM, SKN_CALC, etc.
```

### Error: "UNIT_SUSPICIOUS: Possible wrong unit"
```
Fix: Check if your tonnage is in the right unit.
If you have "50,000" → probably tonnes, not Mt. Divide by 1,000,000 → 0.05 Mt.
Correct range for copper deposits: 0.01 Mt (small) to 150 Mt (giant).
```

### Error: "DUPLICATE: Slug already exists"
```
Fix: A deposit with the same name already exists. Use a different name,
or add a suffix (e.g., "Escondida" → "Escondida Norte").
```

---

## After Import — Verification

### 1. Database check
```sql
SELECT slug, name, country_iso, tonnage_mt
FROM deposits
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 2. API check
```bash
curl "https://copper-atlas.vercel.app/api/v1/deposits?search=YOUR_DEPOSIT_NAME"
```

### 3. Map check
Open the map, search for your deposit name. Verify:
- [ ] Point appears at correct location
- [ ] Color matches deposit type
- [ ] Click opens detail panel
- [ ] All fields display correctly
- [ ] Chinese name shows if set

### 4. Statistics check
Open the statistics dashboard. Verify:
- [ ] Total deposit count increased
- [ ] Country count may have changed
- [ ] Charts updated

---

## Batch Import Workflow

For importing large datasets (100+ records):

```bash
# Step 1: Validate first (dry run)
python scripts/import_deposits.py --validate-only my_data.csv
# Output: "100 records valid, 5 errors. See import_errors.csv"

# Step 2: Fix errors
# Edit import_errors.csv, fix the 5 bad rows

# Step 3: Import
python scripts/import_deposits.py my_data.csv

# Step 4: Verify
python scripts/verify_import.py --count 100

# Step 5: Create release
python scripts/create_release.py --version v1.2.0 --notes "Added 100 copper deposits"
```

---

## Data Update Workflow

To update existing records (e.g., new resource estimate):

```bash
# Use upsert mode — matches on slug, updates changed fields
python scripts/import_deposits.py --upsert updated_tonnages.csv

# Review proposed changes before applying
python scripts/import_deposits.py --upsert --dry-run updated_tonnages.csv
> Review the diff output before confirming
```

### What gets updated in upsert mode
- `tonnage_mt`, `tonnage_grade_pct`, `tonnage_confidence`
- `status`, `operator_company`
- `data_quality_score`, `last_verified_date`
- All description fields

### What does NOT get updated in upsert mode
- `slug`, `name` (these are identity fields)
- `latitude`, `longitude` (requires separate location update)
- `country_iso`, `deposit_type_code` (classification changes need review)
