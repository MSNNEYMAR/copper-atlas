# Copper Atlas — Data Standard

> 全球铜矿床图谱 — 数据标准规范
> Version 2.0 · 2026-07-04 · Phase 2 Data-First
>
> **Scope**: Copper + Gold + Iron + Lithium + Rare Earth + Nickel + Molybdenum + Uranium
> **Principle**: One field name across Database → API → TypeScript → CSV Import

---

## Part 0 — Meta: Why a Standard

Without a data standard, every import is a custom script, every field mapping is
guesswork, every API change breaks the frontend, and every new mineral requires
schema changes.

With this standard:
- A CSV with the correct headers imports without any code changes
- The API returns predictable GeoJSON
- The frontend displays new deposits without any code changes
- New minerals are added by inserting a row in `mineral_i18n`, not by ALTER TABLE

---

## Part I — Core Fields (all minerals, required or optional)

### A. Identification

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 1 | `id` | UUID | Auto | `c119125b-...` | Generated on insert |
| 2 | `slug` | VARCHAR(300) | **Yes** | `chuquicamata` | URL-safe, unique, auto-generated from name if empty |
| 3 | `name` | VARCHAR(500) | **Yes** | `Chuquicamata` | English preferred name |
| 4 | `name_zh` | VARCHAR(500) | No | `丘基卡马塔` | Chinese name |
| 5 | `alternative_names` | TEXT[] | No | `{Chuqui,Chuquicamata Mine}` | Historical, local, or alternate names |

### B. Location

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 6 | `location` | GEOMETRY(Point,4326) | **Yes** | `POINT(-68.9 -22.3)` | WGS84, PostGIS native |
| 7 | `country_id` | UUID FK→countries | **Yes** | | Must exist in countries table |
| 8 | `state_province` | VARCHAR(200) | No | `Antofagasta` | First-level admin division |
| 9 | `elevation_m` | NUMERIC(8,1) | No | `2850.0` | Meters above sea level |
| 10 | `location_precision_m` | NUMERIC(8,1) | No | `100.0` | Estimated coordinate accuracy |
| 11 | `source_srid` | INTEGER | No | `4326` | EPSG code of original coordinates |

### C. Mineral Classification

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 12 | `primary_mineral` | VARCHAR(30) | **Yes** | `copper` | Must exist in `mineral_i18n.mineral_code` |
| 13 | `secondary_minerals` | TEXT[] | No | `{gold,silver,molybdenum}` | By-product minerals |
| 14 | `deposit_classification_id` | UUID FK→deposit_classification | **Yes** | | Must exist in classification table |

### D. Resource Estimates (tonnage, grade)

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 15 | `tonnage_mt` | NUMERIC(12,3) | No | `98.0` | **Million metric tonnes of contained metal** |
| 16 | `tonnage_mt_low` | NUMERIC(12,3) | No | `85.0` | P10 / low estimate |
| 17 | `tonnage_mt_high` | NUMERIC(12,3) | No | `110.0` | P90 / high estimate |
| 18 | `tonnage_ore_mt` | NUMERIC(12,3) | No | `5000.0` | Million tonnes of ore (total rock, not metal) |
| 19 | `tonnage_grade_pct` | NUMERIC(6,3) | No | `0.55` | Average grade in **percent** (0-100) |
| 20 | `tonnage_cutoff_pct` | NUMERIC(6,3) | No | `0.30` | Cutoff grade used for estimation |
| 21 | `tonnage_confidence` | VARCHAR(50) | No | `JORC` | Reporting standard code |
| 22 | `proven_mt` | NUMERIC(12,3) | No | `45.0` | Proven reserves (JORC/CRIRSCO) |
| 23 | `probable_mt` | NUMERIC(12,3) | No | `30.0` | Probable reserves |
| 24 | `measured_mt` | NUMERIC(12,3) | No | `60.0` | Measured resources |
| 25 | `indicated_mt` | NUMERIC(12,3) | No | `20.0` | Indicated resources |
| 26 | `inferred_mt` | NUMERIC(12,3) | No | `18.0` | Inferred resources |

**Unit Standard**:
- Tonnage: **always million metric tonnes (Mt)** of contained metal
- Ore tonnage: **always Mt** of total rock (use `tonnage_ore_mt` field)
- Grade: **always percent (%)**, not permille, not g/t
- Exception for precious metals (Au, Ag, Pt): grade in **g/t** (grams per tonne), clearly marked

### E. Operational Status

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 27 | `status` | VARCHAR(30) | No | `production` | See status codes table |
| 28 | `discovery_year` | SMALLINT | No | `1899` | |
| 29 | `production_start_year` | SMALLINT | No | `1915` | |
| 30 | `production_end_year` | SMALLINT | No | `null` | NULL if still active |
| 31 | `operator_company` | VARCHAR(300) | No | `Codelco` | Current operator |
| 32 | `owner_companies` | TEXT[] | No | `{Codelco}` | All known owners |
| 33 | `mining_method` | VARCHAR(200) | No | `open_pit` | open_pit / underground / block_caving / in_situ_leaching |

### F. Geological Context

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 34 | `host_rock_type` | VARCHAR(300) | No | `Granodiorite porphyry` | |
| 35 | `host_rock_age_min_id` | UUID FK→geological_time_scale | No | | Oldest bound |
| 36 | `host_rock_age_max_id` | UUID FK→geological_time_scale | No | | Youngest bound |
| 37 | `host_rock_age_text` | VARCHAR(200) | No | `Eocene-Oligocene` | Free-text fallback |
| 38 | `mineralization_age_ma` | NUMERIC(7,3) | No | `35.0` | Absolute age in Ma |
| 39 | `mineralization_age_error_ma` | NUMERIC(5,3) | No | `2.0` | ± uncertainty |
| 40 | `mineralization_age_method` | VARCHAR(50) | No | `U-Pb_zircon` | Dating method |
| 41 | `mineralization_age_min_id` | UUID FK→geological_time_scale | No | | |
| 42 | `mineralization_age_max_id` | UUID FK→geological_time_scale | No | | |
| 43 | `tectonic_setting` | VARCHAR(300) | No | `Continental arc` | |
| 44 | `geological_province` | VARCHAR(300) | No | `Central Andes` | |
| 45 | `metallogenic_belt` | VARCHAR(300) | No | `Andean Porphyry Belt` | |
| 46 | `metallogenic_province_id` | UUID FK | No | | Phase 2: new table |
| 47 | `mining_district_id` | UUID FK | No | | Phase 2: new table |

### G. Description

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 48 | `summary_en` | TEXT | No | | English description |
| 49 | `summary_zh` | TEXT | No | | Chinese description |
| 50 | `geology_en` | TEXT | No | | Detailed geology |
| 51 | `geology_zh` | TEXT | No | | |

### H. Data Provenance (every record MUST have these)

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 52 | `data_source` | VARCHAR(500) | **Yes** | `USGS MRDS; Sillitoe (2010)` | Primary data origin |
| 53 | `data_source_url` | TEXT | No | `https://...` | Link to source |
| 54 | `reference_dois` | TEXT[] | No | `{10.2113/gsecongeo.105.1.3}` | DOI references |
| 55 | `data_quality_score` | SMALLINT | **Yes** | `4` | 1-5, see scoring below |
| 56 | `last_verified_date` | DATE | No | `2024-01-15` | Last human verification |
| 57 | `data_license` | VARCHAR(100) | No | `CC-BY-4.0` | License of source data |
| 58 | `retrieved_date` | DATE | No | `2024-06-01` | When data was acquired |
| 59 | `verification_status` | VARCHAR(30) | No | `verified` | raw / pending / verified / disputed |

### I. Media & References

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 60 | `images` | TEXT[] | No | URLs to images |
| 61 | `documents` | TEXT[] | No | URLs to reports |
| 62 | `geological_maps` | TEXT[] | No | URLs to geological maps |
| 63 | `ore_photos` | TEXT[] | No | URLs to ore specimen photos |
| 64 | `thin_section_photos` | TEXT[] | No | URLs to thin section micrographs |
| 65 | `remote_sensing_images` | TEXT[] | No | URLs to satellite/ASTER images |

### J. Metadata

| # | Field | DB Type | Required | Example | Notes |
|---|-------|---------|----------|---------|-------|
| 66 | `tags` | TEXT[] | No | `{giant,porphyry,open-pit}` | |
| 67 | `is_featured` | BOOLEAN | No | `false` | Editor-curated |
| 68 | `is_public` | BOOLEAN | No | `true` | Visibility |
| 69 | `is_active` | BOOLEAN | No | `true` | Soft delete |
| 70 | `properties` | JSONB | No | `{}` | Mineral-specific extensions |
| 71 | `created_at` | TIMESTAMPTZ | Auto | | |
| 72 | `updated_at` | TIMESTAMPTZ | Auto | | |

---

## Part II — Mineral-Specific Extensions (JSONB `properties`)

Different minerals need different fields. Use the JSONB `properties` column
instead of adding columns to the deposits table.

### Copper-specific (`properties` for primary_mineral = "copper")

```json
{
  "supergene_enrichment": true,
  "oxide_zone_depth_m": 150,
  "hypogene_zone_depth_m": 800,
  "copper_minerals": ["chalcopyrite", "bornite", "chalcocite"],
  "recovery_rate_pct": 88.5,
  "concentrate_grade_pct": 28.0
}
```

### Gold-specific

```json
{
  "gold_grade_g_t": 1.5,
  "gold_fineness": 920,
  "deposit_style": "orogenic",
  "visible_gold": true,
  "recovery_method": "CIL",
  "recovery_rate_pct": 92.0
}
```

### Iron-specific

```json
{
  "iron_mineral": "hematite",
  "fe_content_pct": 62.5,
  "ore_type": "BIF",
  "beneficiation": "magnetic_separation",
  "lump_fine_ratio": 0.65,
  "phosphorus_pct": 0.05
}
```

### Lithium-specific

```json
{
  "deposit_form": "brine",
  "li_concentration_mg_l": 1500,
  "mg_li_ratio": 6.5,
  "brine_type": "salar",
  "evaporation_rate_mm_yr": 2500,
  "lce_resource_kt": 5000
}
```

---

## Part III — Data Quality Score

| Score | Label | Criteria |
|-------|-------|----------|
| 5 | Peer-reviewed | Published in peer-reviewed journal with full data |
| 4 | Official report | NI 43-101 / JORC / CRIRSCO / government survey |
| 3 | Reliable source | Company disclosure, reputable database |
| 2 | Secondary source | News article, conference abstract, unverified |
| 1 | Unknown | Historical estimate, source lost |

---

## Part IV — Unit Standardization

| Measurement | Standard Unit | Abbreviation | Conversion Notes |
|-------------|--------------|--------------|------------------|
| Contained metal | Million metric tonnes | Mt | 1 Mt = 1,000,000 tonnes = 1,000,000,000 kg |
| Ore tonnage | Million metric tonnes | Mt | Total rock mass |
| Grade (base metals) | Percent | % | Cu%, Zn%, Pb% (0-100) |
| Grade (precious metals) | Grams per tonne | g/t | Au g/t, Ag g/t |
| Grade (Li brine) | Milligrams per litre | mg/L | |
| Elevation | Metres | m | Above sea level |
| Distance | Kilometres | km | |
| Age | Million years | Ma | Before present |
| Coordinates | Decimal degrees | ° | WGS84 (EPSG:4326) |
| Area | Square kilometres | km² | |
| Production | Tonnes per year | t/yr | Annual metal production |

**Forbidden units**: short tons, pounds, ounces (except Au troy oz — must be converted to g/t),
feet, miles, acres.

---

## Part V — Coordinate Policy

1. **All coordinates**: WGS84 (EPSG:4326), decimal degrees
2. **Order**: `[longitude, latitude]` — GeoJSON standard
3. **Precision**: 6 decimal places (~0.1m precision) for deposit centroid
4. **Approximate locations**: Use `location_approx` field, set `location_precision_m`
5. **Sensitive sites**: Set `is_public = false`, use `location_approx` only
6. **Zero coordinates** (0,0): REJECT during validation
7. **Antimeridian**: Pacific deposits may cross ±180° — handled by PostGIS

---

## Part VI — Temporal Policy

1. **Absolute ages**: Million years (Ma), stored as `NUMERIC(7,3)`
2. **Relative ages**: Reference `geological_time_scale` table (ICS 2024)
3. **Dates**: ISO 8601 format (`YYYY-MM-DD`)
4. **Years only**: SMALLINT (e.g. `discovery_year = 1899`)
5. **Durations**: As appropriate (years, million years)
6. **Uncertainty**: Always store ± error when available

---

## Part VII — Naming Convention (Universal)

```
Rule 1: snake_case for all fields in all layers
Rule 2: No abbreviations longer than 4 characters (except standard ones: mt, pct, ma)
Rule 3: Units in field name for clarity: tonnage_mt, elevation_m, grade_pct, age_ma
Rule 4: Language suffix for text: name_zh, summary_en, summary_zh
Rule 5: Boolean prefix: is_featured, is_public, is_active
Rule 6: Foreign keys: <entity>_id (country_id, deposit_classification_id)
Rule 7: Arrays: plural form (tags, images, secondary_minerals)
Rule 8: JSONB extension: singular form (properties)
```

---

## Part VIII — Deposit Classification Hierarchy

See `data/seeds/01_deposit_classification.sql` for complete hierarchy.

Top-level valid codes for copper:
`POR` `POR_CUMO` `POR_CUAU` `POR_AU`
`SED` `SED_SSC` `SED_SEDEX`
`VMS` `VMS_BM` `VMS_BF` `VMS_PM`
`IOCG` `IOCG_HEM` `IOCG_MAG`
`SKN` `SKN_CALC` `SKN_MAG`
`EPI` `EPI_HS` `EPI_LS` `EPI_IS`
`MAG`
`OTH`

---

## Part IX — Mineral Registry

All valid mineral codes (Phase 1-3):

| Code | Symbol | Group | Phase |
|------|--------|-------|-------|
| `copper` | Cu | Base Metals | 1 |
| `gold` | Au | Precious Metals | 2 |
| `iron` | Fe | Ferrous Metals | 2 |
| `lithium` | Li | Battery Metals | 2 |
| `zinc` | Zn | Base Metals | 3 |
| `lead` | Pb | Base Metals | 3 |
| `nickel` | Ni | Battery/Stainless | 3 |
| `silver` | Ag | Precious Metals | 3 |
| `molybdenum` | Mo | Refractory | 3 |
| `cobalt` | Co | Battery Metals | 3 |
| `rare_earth` | REE | Critical Minerals | 3 |
| `uranium` | U | Energy | 3 |

---

## Part X — CSV Import Mapping

When importing, these external column names are automatically mapped to canonical names:

| Canonical | Accepted CSV Headers (case-insensitive) |
|-----------|----------------------------------------|
| `name` | name_en, name, deposit_name, site_name, deposit |
| `name_zh` | name_zh, name_cn, chinese_name, name_chinese |
| `country_iso` | country_iso, country, iso_code, country_code, nation |
| `latitude` | latitude, lat, y |
| `longitude` | longitude, lon, lng, long, x |
| `primary_mineral` | primary_mineral, commodity, mineral, main_commodity |
| `deposit_type_code` | deposit_type_code, deposit_type, type, class |
| `tonnage_mt` | tonnage_mt, tonnage, reserve, reserve_mt, contained_metal, resource |
| `tonnage_grade_pct` | tonnage_grade_pct, grade, grade_pct, cu_pct, average_grade |
| `status` | status, operational_status, op_status, mine_status |
| `data_quality_score` | data_quality_score, quality, confidence, reliability |
| `operator_company` | operator_company, operator, company, owner |
| `data_source` | data_source, source, reference, citation |

---

## Part XI — API Response Shape

Every deposit, whether copper, gold, or lithium, returns the same GeoJSON shape.
Mineral-specific data lives in `properties.properties` (JSONB).

```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "id": "uuid",
    "geometry": { "type": "Point", "coordinates": [lng, lat] },
    "properties": {
      "id": "uuid",
      "name": "...",
      "primary_mineral": "copper",
      "...": "...",
      "country_iso": "CL",
      "deposit_type_code": "POR_CUMO",
      "properties": { "supergene_enrichment": true }
    }
  }],
  "meta": { "total": 100, "page": 1, "size": 200, "pages": 1 }
}
```

**Guarantee**: This shape never changes. New fields are added but old fields are never removed or renamed. Breaking changes require a major API version (`/api/v2`).
