#!/usr/bin/env python3
"""
Generate seed.geojson from seed.csv.

Usage: python generate_geojson.py
Output: seed.geojson (GeoJSON FeatureCollection)
"""

import csv, json
from pathlib import Path

HERE = Path(__file__).parent
CSV_PATH = HERE / "seed.csv"
GEOJSON_PATH = HERE / "seed.geojson"

def main():
    features = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lat = float(row["latitude"])
            lng = float(row["longitude"])

            # Build properties — exclude lat/lng (they go in geometry)
            props = {}
            for k, v in row.items():
                if k in ("latitude", "longitude"):
                    continue
                # Convert numeric strings (with safety)
                if k in ("tonnage_mt", "tonnage_grade_pct"):
                    try: props[k] = float(v) if v else None
                    except: props[k] = v
                elif k in ("discovery_year", "production_start_year", "data_quality_score"):
                    try: props[k] = int(v) if v else None
                    except: props[k] = v
                elif k == "is_featured":
                    props[k] = v.lower() in ("yes", "true", "1") if v else False
                elif k in ("secondary_minerals", "tags"):
                    props[k] = [x.strip() for x in v.split(";")] if v else []
                elif k == "sources_doi":
                    props[k] = [x.strip() for x in v.split(";")] if v else []
                else:
                    props[k] = v if v else None

            features.append({
                "type": "Feature",
                "id": props.get("name_en", "").lower().replace(" ", "-"),
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat],
                },
                "properties": props,
            })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "name": "Global Copper Deposits Atlas — Seed Dataset v0.1",
            "description": "100 representative copper deposits from 28 countries",
            "version": "0.1.0",
            "created": "2026-07-04",
            "license": "CC-BY-4.0",
            "sources": [
                "USGS Mineral Resources Data System (MRDS)",
                "Company NI 43-101 / JORC Technical Reports",
                "National Geological Surveys",
                "Peer-reviewed literature (Economic Geology, Mineralium Deposita, etc.)"
            ],
            "total_deposits": len(features),
        },
    }

    with open(GEOJSON_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)

    print(f"Generated {GEOJSON_PATH} with {len(features)} features")
    print(f"File size: {GEOJSON_PATH.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    main()
