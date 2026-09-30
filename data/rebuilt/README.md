# Rebuilt Local Copper Deposit Dataset

Generated from local curated and USGS MRDS source files without Supabase.

## Result

- Final records: **2,613**
- Curated records: **100**
- USGS MRDS records added: **2,513**
- Countries: **93**
- Invalid coordinates: **0**
- Unmapped countries: **0**
- True duplicates removed: **52**
- Same-name distinct records kept: **32**

The previous database report documented 2,094 active records. The rebuilt dataset is larger because country names were normalized to ISO alpha-2 codes and no valid records were discarded because of the old 43-country database whitelist.

## Sources

- `data/seed_v2/seed.csv`
- `data/tmp_gh/USGS_MRDS_Porphyry_copper_deposit.csv`
- `data/tmp_gh/USGS_MRDS_Sed_copper_deposit.csv`
- `data/tmp_gh/USGS_MRDS_VMS_deposit.csv`

## Outputs

- `copper_deposits.csv`: full normalized tabular dataset
- `copper_deposits.geojson`: map-ready GeoJSON
- `rebuild_report.json`: counts, distributions, and coverage
- `duplicates_skipped.csv`: duplicate audit trail
- `checksums.sha256`: SHA-256 checksums

## Rebuild

```bash
python -m pip install pycountry
python scripts/rebuild_local_dataset.py
```

The curated 100 records have priority. A USGS record is treated as a duplicate only when the normalized slug matches, the country matches, and both coordinates are within 0.25 degrees. Same-name records farther apart or in another country are retained with a disambiguated slug.
