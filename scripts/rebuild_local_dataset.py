#!/usr/bin/env python3
"""Rebuild a unified local copper-deposit dataset.

Priority order:
1. curated seed_v2 records
2. USGS MRDS porphyry, sediment-hosted, and VMS records

The script normalizes country names to ISO alpha-2, maps deposit types,
calculates contained-metal tonnage, removes true duplicates, and writes:
- data/rebuilt/copper_deposits.csv
- data/rebuilt/copper_deposits.geojson
- data/rebuilt/rebuild_report.json
- data/rebuilt/duplicates_skipped.csv
"""

from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

try:
    import pycountry
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Install pycountry first: python -m pip install pycountry") from exc

ROOT = Path(__file__).resolve().parents[1]
CURATED_PATH = ROOT / "data" / "seed_v2" / "seed.csv"
SOURCE_DIR = ROOT / "data" / "tmp_gh"
OUTPUT_DIR = ROOT / "data" / "rebuilt"

SOURCE_FILES = [
    "USGS_MRDS_Porphyry_copper_deposit.csv",
    "USGS_MRDS_Sed_copper_deposit.csv",
    "USGS_MRDS_VMS_deposit.csv",
]

COUNTRY_ALIASES = {
    "Afganistan": "AF",
    "Congo Brazzaville": "CG",
    "Democratic Republic of Congo": "CD",
    "England": "GB",
    "Great Britain": "GB",
    "Guatamala": "GT",
    "Kazakstan": "KZ",
    "Kyrghyzstan": "KG",
    "Macedonia": "MK",
    "Russia": "RU",
    "Scotland": "GB",
    "Turkey": "TR",
    "Union of Myanmar": "MM",
    "Yugoslavia": "RS",
}

PORPHYRY_TYPES = {
    "17": "POR_CUMO",
    "20c": "POR_CUAU",
    "21a": "POR_CUMO",
}
SEDIMENT_TYPES = {
    "Redbed Cu": "SED_SSC",
    "Reduced facies Cu": "SED_SSC",
    "Revett Cu": "SED_SSC",
    "Uncl.": "OTH",
    "Unclassified": "OTH",
}
VMS_TYPES = {
    "Felsic": "VMS_BF",
    "Mafic": "VMS_BM",
    "Bimodal-Mafic": "VMS_BM",
}

CSV_FIELDS = [
    "id",
    "slug",
    "name_en",
    "name_zh",
    "country_iso",
    "state_province",
    "latitude",
    "longitude",
    "primary_mineral",
    "secondary_minerals",
    "deposit_type_code",
    "tonnage_mt",
    "tonnage_grade_pct",
    "tonnage_confidence",
    "status",
    "discovery_year",
    "production_start_year",
    "operator_company",
    "mining_method",
    "host_rock_type",
    "host_rock_age_text",
    "tectonic_setting",
    "geological_province",
    "metallogenic_belt",
    "summary_en",
    "data_source",
    "data_quality_score",
    "is_featured",
    "tags",
    "sources_doi",
    "last_verified_date",
    "source_file",
    "source_id",
    "record_kind",
]

def slugify(value: str, max_length: int = 200) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower().strip())
    return value.strip("-")[:max_length]


def normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def safe_float(value: Any) -> float | None:
    try:
        result = float(str(value).strip())
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def safe_int(value: Any) -> int | None:
    number = safe_float(value)
    return int(number) if number is not None else None


def parse_year(value: Any) -> int | None:
    match = re.search(r"(18|19|20)\d{2}", str(value or ""))
    return int(match.group(0)) if match else None


def parse_bool(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y"}


def iso_alpha2(country_name: str) -> str | None:
    name = normalize_text(country_name)
    if name in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[name]
    for field in ("name", "common_name", "official_name"):
        try:
            country = pycountry.countries.get(**{field: name})
            if country:
                return country.alpha_2
        except (KeyError, LookupError):
            pass
    return None


def split_list(value: Any) -> list[str]:
    text = normalize_text(value)
    if not text:
        return []
    parts = re.split(r"[;,|]", text)
    seen: set[str] = set()
    result: list[str] = []
    for part in parts:
        item = normalize_text(part)
        key = item.lower()
        if item and key not in seen:
            seen.add(key)
            result.append(item)
    return result


def contained_tonnage_mt(oreton: Any, grade_pct: Any) -> float | None:
    ore = safe_float(oreton)
    grade = safe_float(grade_pct)
    if ore is None or ore <= 0:
        return None
    if grade is not None and grade > 0:
        return round((ore * grade / 100) / 1_000_000, 6)
    return round(ore / 1_000_000, 6)


def type_code_for(source_file: str, deposit_type: str) -> str:
    raw_type = normalize_text(deposit_type)
    if source_file == SOURCE_FILES[0]:
        return PORPHYRY_TYPES.get(raw_type, "OTH")
    if source_file == SOURCE_FILES[1]:
        return SEDIMENT_TYPES.get(raw_type, "OTH")
    if source_file == SOURCE_FILES[2]:
        return VMS_TYPES.get(raw_type, "OTH")
    return "OTH"


def is_true_duplicate(existing: dict[str, Any], candidate: dict[str, Any]) -> bool:
    if existing["country_iso"] != candidate["country_iso"]:
        return False
    return (
        abs(existing["latitude"] - candidate["latitude"]) <= 0.25
        and abs(existing["longitude"] - candidate["longitude"]) <= 0.25
    )

def load_curated() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with CURATED_PATH.open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            latitude = safe_float(row.get("latitude"))
            longitude = safe_float(row.get("longitude"))
            if latitude is None or longitude is None:
                continue
            name = normalize_text(row.get("name_en"))
            slug = slugify(name)
            rows.append(
                {
                    "id": slug,
                    "slug": slug,
                    "name_en": name,
                    "name_zh": normalize_text(row.get("name_zh")),
                    "country_iso": normalize_text(row.get("country_iso")).upper(),
                    "state_province": normalize_text(row.get("state_province")),
                    "latitude": latitude,
                    "longitude": longitude,
                    "primary_mineral": normalize_text(row.get("primary_mineral")) or "copper",
                    "secondary_minerals": split_list(row.get("secondary_minerals")),
                    "deposit_type_code": normalize_text(row.get("deposit_type_code")) or "OTH",
                    "tonnage_mt": safe_float(row.get("tonnage_mt")),
                    "tonnage_grade_pct": safe_float(row.get("tonnage_grade_pct")),
                    "tonnage_confidence": normalize_text(row.get("tonnage_confidence")),
                    "status": normalize_text(row.get("status")) or "unknown",
                    "discovery_year": safe_int(row.get("discovery_year")),
                    "production_start_year": safe_int(row.get("production_start_year")),
                    "operator_company": normalize_text(row.get("operator_company")),
                    "mining_method": normalize_text(row.get("mining_method")),
                    "host_rock_type": normalize_text(row.get("host_rock_type")),
                    "host_rock_age_text": normalize_text(row.get("host_rock_age_text")),
                    "tectonic_setting": normalize_text(row.get("tectonic_setting")),
                    "geological_province": normalize_text(row.get("geological_province")),
                    "metallogenic_belt": normalize_text(row.get("metallogenic_belt")),
                    "summary_en": normalize_text(row.get("summary_en")),
                    "data_source": normalize_text(row.get("data_source")),
                    "data_quality_score": safe_int(row.get("data_quality_score")),
                    "is_featured": parse_bool(row.get("is_featured")),
                    "tags": split_list(row.get("tags")),
                    "sources_doi": split_list(row.get("sources_doi")),
                    "last_verified_date": normalize_text(row.get("last_verified_date")),
                    "source_file": "seed_v2/seed.csv",
                    "source_id": slug,
                    "record_kind": "curated",
                }
            )
    return rows


def normalize_usgs_row(source_file: str, row: dict[str, Any]) -> dict[str, Any] | None:
    name = normalize_text(row.get("depname"))
    country_iso = iso_alpha2(normalize_text(row.get("country")))
    latitude = safe_float(row.get("latitude"))
    longitude = safe_float(row.get("longitude"))
    if not name or not country_iso or latitude is None or longitude is None:
        return None
    if latitude == 0 and longitude == 0:
        return None
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return None

    raw_type = normalize_text(row.get("deptype"))
    deposit_type = type_code_for(source_file, raw_type)
    grade = safe_float(row.get("cugrd"))
    tonnage = contained_tonnage_mt(row.get("oreton"), grade)
    record_id = normalize_text(row.get("rec_id"))
    base_slug = slugify(name)

    host_rock = ""
    tectonic = ""
    province = ""
    if source_file == SOURCE_FILES[0]:
        host_rock = normalize_text(row.get("rockdep"))
    elif source_file == SOURCE_FILES[1]:
        host_rock = normalize_text(row.get("hostrock"))
        province = normalize_text(row.get("geolprov"))
    elif source_file == SOURCE_FILES[2]:
        tectonic = normalize_text(row.get("lithotect"))

    tags = ["usgs-mrds"]
    if raw_type:
        tags.append(raw_type.lower())
    if source_file == SOURCE_FILES[0]:
        tags.append("porphyry")
    elif source_file == SOURCE_FILES[1]:
        tags.append("sediment-hosted")
    else:
        tags.append("vms")

    return {
        "id": base_slug,
        "slug": base_slug,
        "name_en": name,
        "name_zh": "",
        "country_iso": country_iso,
        "state_province": normalize_text(row.get("stprov")),
        "latitude": latitude,
        "longitude": longitude,
        "primary_mineral": "copper",
        "secondary_minerals": [],
        "deposit_type_code": deposit_type,
        "tonnage_mt": tonnage,
        "tonnage_grade_pct": grade,
        "tonnage_confidence": "USGS MRDS",
        "status": "unknown",
        "discovery_year": parse_year(row.get("discdate")),
        "production_start_year": parse_year(row.get("startdate")),
        "operator_company": "",
        "mining_method": "",
        "host_rock_type": host_rock,
        "host_rock_age_text": normalize_text(row.get("depage")),
        "tectonic_setting": tectonic,
        "geological_province": province,
        "metallogenic_belt": "",
        "summary_en": normalize_text(row.get("comments"))[:2000],
        "data_source": "USGS MRDS",
        "data_quality_score": 3,
        "is_featured": False,
        "tags": tags,
        "sources_doi": [],
        "last_verified_date": "",
        "source_file": source_file,
        "source_id": record_id,
        "record_kind": "usgs-mrds",
    }

def build_dataset() -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, Any]]]:
    curated = load_curated()
    records_by_slug: dict[str, dict[str, Any]] = {}
    for row in curated:
        records_by_slug[row["slug"]] = row

    duplicate_rows: list[dict[str, Any]] = []
    counters = Counter()
    unmatched_countries: Counter[str] = Counter()

    for source_file in SOURCE_FILES:
        source_path = SOURCE_DIR / source_file
        with source_path.open(encoding="utf-8", errors="replace", newline="") as handle:
            for raw_row in csv.DictReader(handle):
                counters["raw_records"] += 1
                country_name = normalize_text(raw_row.get("country"))
                if not iso_alpha2(country_name):
                    unmatched_countries[country_name] += 1
                    counters["skipped_country"] += 1
                    continue

                row = normalize_usgs_row(source_file, raw_row)
                if row is None:
                    counters["skipped_invalid"] += 1
                    continue

                base_slug = row["slug"]
                existing = records_by_slug.get(base_slug)
                if existing and is_true_duplicate(existing, row):
                    counters["duplicates_removed"] += 1
                    duplicate_rows.append(
                        {
                            "name": row["name_en"],
                            "country_iso": row["country_iso"],
                            "latitude": row["latitude"],
                            "longitude": row["longitude"],
                            "kept_source": existing["source_file"],
                            "kept_source_id": existing["source_id"],
                            "skipped_source": row["source_file"],
                            "skipped_source_id": row["source_id"],
                        }
                    )
                    continue

                slug = base_slug
                if existing:
                    counters["same_name_distinct_records"] += 1
                    suffix = f"{row['country_iso'].lower()}-{row['source_id']}"
                    slug = f"{base_slug[:150]}-{suffix}"
                    index = 2
                    while slug in records_by_slug:
                        slug = f"{base_slug[:145]}-{suffix}-{index}"
                        index += 1
                row["slug"] = slug
                row["id"] = slug
                records_by_slug[slug] = row

    records = sorted(
        records_by_slug.values(),
        key=lambda row: (row["country_iso"], row["name_en"].lower(), row["slug"]),
    )
    report = {
        "curated_records": len(curated),
        "raw_usgs_records": counters["raw_records"],
        "usgs_records_added": sum(1 for row in records if row["record_kind"] == "usgs-mrds"),
        "duplicates_removed": counters["duplicates_removed"],
        "same_name_distinct_records_kept": counters["same_name_distinct_records"],
        "skipped_invalid": counters["skipped_invalid"],
        "skipped_unmapped_country": counters["skipped_country"],
        "final_records": len(records),
        "countries": len({row["country_iso"] for row in records}),
        "missing_coordinates": sum(
            1 for row in records if row["latitude"] is None or row["longitude"] is None
        ),
        "missing_tonnage": sum(1 for row in records if row["tonnage_mt"] is None),
        "missing_grade": sum(1 for row in records if row["tonnage_grade_pct"] is None),
        "type_counts": dict(Counter(row["deposit_type_code"] for row in records)),
        "country_counts": dict(Counter(row["country_iso"] for row in records).most_common()),
        "unmatched_countries": dict(unmatched_countries.most_common()),
        "source_file_counts": dict(Counter(row["source_file"] for row in records)),
        "record_kind_counts": dict(Counter(row["record_kind"] for row in records)),
    }
    return records, report, duplicate_rows


def csv_value(value: Any) -> Any:
    if isinstance(value, list):
        return ";".join(str(item) for item in value)
    if isinstance(value, bool):
        return "yes" if value else "no"
    return "" if value is None else value


def write_outputs(
    records: list[dict[str, Any]],
    report: dict[str, Any],
    duplicate_rows: list[dict[str, Any]],
) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with (OUTPUT_DIR / "copper_deposits.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in records:
            writer.writerow({field: csv_value(row.get(field)) for field in CSV_FIELDS})

    features = []
    for row in records:
        properties = {
            "id": row["id"],
            "name_en": row["name_en"],
            "name_zh": row["name_zh"] or None,
            "country_iso": row["country_iso"],
            "state_province": row["state_province"] or None,
            "primary_mineral": row["primary_mineral"],
            "secondary_minerals": row["secondary_minerals"],
            "deposit_type_code": row["deposit_type_code"],
            "tonnage_mt": row["tonnage_mt"],
            "tonnage_grade_pct": row["tonnage_grade_pct"],
            "tonnage_confidence": row["tonnage_confidence"] or None,
            "status": row["status"],
            "discovery_year": row["discovery_year"],
            "production_start_year": row["production_start_year"],
            "operator_company": row["operator_company"] or None,
            "mining_method": row["mining_method"] or None,
            "host_rock_type": row["host_rock_type"] or None,
            "host_rock_age_text": row["host_rock_age_text"] or None,
            "tectonic_setting": row["tectonic_setting"] or None,
            "geological_province": row["geological_province"] or None,
            "metallogenic_belt": row["metallogenic_belt"] or None,
            "summary_en": row["summary_en"] or None,
            "data_source": row["data_source"] or None,
            "data_quality_score": row["data_quality_score"],
            "is_featured": row["is_featured"],
            "tags": row["tags"],
            "sources_doi": row["sources_doi"],
            "last_verified_date": row["last_verified_date"] or None,
            "source_file": row["source_file"],
            "record_kind": row["record_kind"],
        }
        features.append(
            {
                "type": "Feature",
                "id": row["slug"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [row["longitude"], row["latitude"]],
                },
                "properties": properties,
            }
        )

    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "name": "Global Copper Deposits Atlas — Rebuilt Local Dataset",
            "version": "1.0.0",
            "license": "See source-specific licenses in data/seed_v2/sources.md",
            "total_deposits": len(features),
        },
        "features": features,
    }
    (OUTPUT_DIR / "copper_deposits.geojson").write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (OUTPUT_DIR / "rebuild_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    duplicate_fields = [
        "name",
        "country_iso",
        "latitude",
        "longitude",
        "kept_source",
        "kept_source_id",
        "skipped_source",
        "skipped_source_id",
    ]
    with (OUTPUT_DIR / "duplicates_skipped.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=duplicate_fields)
        writer.writeheader()
        writer.writerows(duplicate_rows)


def main() -> None:
    records, report, duplicates = build_dataset()
    write_outputs(records, report, duplicates)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
