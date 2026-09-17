# Copper Atlas — Quality Control

> 全球铜矿床图谱 — 质量控制流程
> Version 1.0 · 2026-07-04

---

## QC Pipeline

Every deposit record passes through five quality gates before publication.

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Gate 1   │    │ Gate 2   │    │ Gate 3   │    │ Gate 4   │    │ Gate 5   │
│ Import   │───▶│ Spatial  │───▶│ Data     │───▶│ API      │───▶│ Map      │
│ Validation│   │ Validity │    │ Completeness│  │ Response │    │ Display  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## Gate 1 — Import Validation

**Run on**: Every import operation

| Check | Rule | Failure Action |
|-------|------|---------------|
| File readable | Valid format, not corrupted | Reject file |
| Header match | All required columns present | Reject file |
| Encoding valid | UTF-8 detectable | Auto-convert or reject |
| Row count | > 0 data rows | Warn |

**Pass threshold**: 100% (no file-level errors)

---

## Gate 2 — Spatial Validity

**Run on**: Every record

| # | Check | Rule | Failure Action |
|---|-------|------|---------------|
| 1 | Coordinate present | Neither NULL nor NaN | **Reject record** |
| 2 | Latitude range | -90 ≤ lat ≤ 90 | **Reject record** |
| 3 | Longitude range | -180 ≤ lon ≤ 180 | **Reject record** |
| 4 | Not null island | (lat,lon) ≠ (0,0) | **Reject record** |
| 5 | In correct country | Point within country polygon | Warn, flag for review |
| 6 | Not in ocean | Point on land (≥1km from coast) | Warn |
| 7 | Coordinate precision | ≤ 6 decimal places | Truncate |
| 8 | No duplicate location | > 1km from any existing deposit | Check name similarity |

**Pass threshold**: Checks 1-4 must ALL pass. Checks 5-8 are warnings.

---

## Gate 3 — Data Completeness

**Run on**: Records passing Gate 2

| # | Field | Expected | Weight |
|---|-------|----------|--------|
| 1 | `name` | Non-empty | Required |
| 2 | `country_id` | Valid FK | Required |
| 3 | `deposit_classification_id` | Valid FK | Required |
| 4 | `primary_mineral` | In mineral registry | Required |
| 5 | `tonnage_mt` | > 0 if present | High |
| 6 | `tonnage_grade_pct` | 0 < grade < 100 | High |
| 7 | `status` | Valid status code | Medium |
| 8 | `data_source` | Non-empty | High |
| 9 | `discovery_year` | 1800 ≤ year ≤ current | Low |
| 10 | `summary_en` | Non-empty | Low |

### Completeness Score

```
score = sum(weight of passed fields) / sum(weight of all fields) * 100

90-100%: Excellent — auto-publish
70-89%:  Good — publish with note
50-69%:  Fair — flag for enrichment
<50%:    Poor — hold for review
```

---

## Gate 4 — API Response

**Run on**: After database INSERT

```python
def gate_4_verify(deposit_id: str) -> bool:
    # 1. API returns 200
    resp = requests.get(f"{API}/deposits/{deposit_id}")
    assert resp.status_code == 200

    data = resp.json()
    # 2. Correct GeoJSON structure
    assert data["type"] == "Feature"
    assert data["geometry"]["type"] == "Point"
    assert len(data["geometry"]["coordinates"]) == 2

    # 3. Properties match input
    props = data["properties"]
    assert props["id"] == deposit_id
    assert props["name"] is not None
    assert props["slug"] is not None
    assert props["primary_mineral"] is not None

    # 4. Country joined correctly
    assert props["country_iso"] is not None

    # 5. Classification joined correctly
    assert props["deposit_type_code"] is not None

    return True
```

**Pass threshold**: 100% (API must return valid GeoJSON for every published deposit)

---

## Gate 5 — Map Display

**Run on**: Visual verification (automated via Playwright)

```typescript
test('deposit appears on map', async ({ page }) => {
  await page.goto('/en/map');
  await page.waitForSelector('.maplibregl-canvas-container');

  // Search for the deposit
  await page.fill('input[type="search"]', depositName);
  await page.waitForTimeout(1000);

  // Verify map has the GeoJSON source populated
  const features = await page.evaluate(() => {
    const map = (window as any).__mapInstance;
    const source = map.getSource('copper-deposits-geojson');
    return source._data.features;
  });

  expect(features.length).toBeGreaterThan(0);
  expect(features.some((f: any) => f.properties.name === depositName)).toBe(true);
});
```

---

## Automated QC Report

Generated after every import and weekly for the entire database.

### Report Format

```
Quality Control Report — 2026-07-04
─────────────────────────────────────

DATABASE SUMMARY
  Total deposits:     124
  Published:          120
  Pending review:       3
  Quarantined:          1

GATE 1 — Import Validation
  Files processed:      3
  Files passed:         3  ✅
  Records imported:   100

GATE 2 — Spatial Validity
  Passed:             100  ✅
  Flagged (ocean):      2  ⚠️
  Rejected:             0

GATE 3 — Data Completeness
  Excellent (>90%):    85
  Good (70-89%):       12
  Fair (50-69%):        3  ⚠️
  Poor (<50%):          0

GATE 4 — API Response
  Deposits checked:   124
  Valid GeoJSON:      124  ✅
  Broken:               0

GATE 5 — Map Display
  Visual check:        10  (sampled)
  Displayed correctly:  10  ✅

TOP ISSUES
  1. 3 deposits missing summary_en (escondida-norte, ...)
  2. 2 deposits flagged as "in ocean" (lat/lng may be swapped)
  3. 1 deposit has data_quality_score = 1 (unverified)

RECOMMENDATIONS
  - Review the 3 low-completeness deposits
  - Verify coordinates for 2 ocean-flagged deposits
  - Enrich 3 deposits with descriptions
```

---

## Weekly QC Tasks

| Task | Frequency | Owner |
|------|-----------|-------|
| Run full QC report | Weekly | Automated |
| Review flagged duplicates | Weekly | Editor |
| Verify ocean-flagged coordinates | Weekly | Editor |
| Update USGS MRDS data | Monthly | Pipeline |
| Re-verify Tier 3 sources | Quarterly | Reviewer |
| Dataset release to Zenodo | Quarterly | Admin |
| Full database integrity check | Monthly | Automated |

---

## Integrity Checks (SQL)

### Find deposits with NULL required fields
```sql
SELECT slug, name FROM deposits
WHERE name IS NULL
   OR country_id IS NULL
   OR deposit_classification_id IS NULL
   OR location IS NULL
   OR is_active = true;
```

### Find deposits without provenance
```sql
SELECT d.slug, d.name FROM deposits d
LEFT JOIN provenance_entity pe ON pe.entity_id = d.id AND pe.entity_type = 'deposit'
WHERE pe.id IS NULL AND d.is_active = true;
```

### Find deposits with suspicious coordinates
```sql
SELECT slug, name, ST_AsText(location)
FROM deposits
WHERE ST_X(location) = 0 AND ST_Y(location) = 0;
```

### Find duplicate names in same country
```sql
SELECT a.slug, b.slug, a.name, c.name_en
FROM deposits a
JOIN deposits b ON a.country_id = b.country_id
               AND a.name = b.name
               AND a.id < b.id
JOIN countries c ON a.country_id = c.id
WHERE a.is_active = true AND b.is_active = true;
```

### Find deposits with grade > 100% (impossible)
```sql
SELECT slug, name, tonnage_grade_pct
FROM deposits
WHERE tonnage_grade_pct > 100;
```

### Find deposits with discovery year > current year
```sql
SELECT slug, name, discovery_year
FROM deposits
WHERE discovery_year > EXTRACT(YEAR FROM NOW());
```
