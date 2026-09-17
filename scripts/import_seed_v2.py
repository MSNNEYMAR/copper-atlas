"""
Import 100 deposits from data/seed_v2/seed.csv into Supabase.
Each row: generate slug, resolve FKs, build INSERT with proper escaping.
"""
import csv, json, os, re, subprocess, sys

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
SQL_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def exec_sql(stmt):
    body = json.dumps({"query": stmt})
    r = subprocess.run([
        "curl", "-s", "-w", "%{http_code}", "-X", "POST", SQL_API,
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", body,
    ], capture_output=True, text=True, timeout=60)
    out = r.stdout.strip()
    code = out[-3:] if len(out) >= 3 else "000"
    return code in ("200", "201"), out[:-3].strip()[:250]

def esc(s):
    """Escape string for PostgreSQL: single quotes doubled, wrap in quotes."""
    if s is None: return "NULL"
    return f"'{s.replace(chr(39), chr(39)+chr(39))}'"

def esc_dollar(s):
    """Escape for $$ quoting: wrap in $$...$$"""
    if s is None: return "NULL"
    return f"$${s}$$"

def arr(arr_list):
    """Format Python list as PostgreSQL ARRAY[...]"""
    if not arr_list: return "NULL"
    items = ", ".join(esc(x) for x in arr_list)
    return f"ARRAY[{items}]"

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s).strip()
    s = re.sub(r'[-\s]+', '-', s)
    return s[:200]

def safe_int(v):
    try: return str(int(v))
    except: return "NULL"

def safe_float(v):
    try: return f"{float(v)}::numeric"
    except: return "NULL"

def safe_bool(v):
    if v is None: return "false"
    return "true" if str(v).strip().lower() in ("yes", "true", "1") else "false"

def parse_array(val):
    if not val or not val.strip(): return []
    return [x.strip() for x in val.split(";") if x.strip()]

def main():
    CSV_PATH = os.path.expanduser("~/copper-atlas/data/seed_v2/seed.csv")
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Read {len(rows)} deposits from CSV\n")
    print(f"CSV columns: {reader.fieldnames}\n")

    ok, skip, fail = 0, 0, 0
    for i, row in enumerate(rows):
        name = (row.get("name_en") or "").strip()
        if not name:
            continue

        slug_val = slugify(name)

        # Build SQL value list in column order matching the DB table
        sql_fields = []
        sql_vals = []

        # slug
        sql_fields.append("slug"); sql_vals.append(esc(slug_val))
        # name
        sql_fields.append("name"); sql_vals.append(esc(name))
        # name_zh
        nz = row.get("name_zh", "").strip()
        sql_fields.append("name_zh"); sql_vals.append(esc(nz) if nz else "NULL")
        # primary_mineral
        sql_fields.append("primary_mineral"); sql_vals.append(esc((row.get("primary_mineral") or "copper").strip()))
        # secondary_minerals
        sql_fields.append("secondary_minerals"); sql_vals.append(arr(parse_array(row.get("secondary_minerals", ""))))
        # deposit_classification_id (resolve by subquery)
        tc = (row.get("deposit_type_code") or "").strip()
        sql_fields.append("deposit_classification_id")
        sql_vals.append(f"(SELECT id FROM deposit_classification WHERE code = {esc(tc)} LIMIT 1)")
        # country_id
        ci = (row.get("country_iso") or "").strip()
        sql_fields.append("country_id")
        sql_vals.append(f"(SELECT id FROM countries WHERE iso_code = {esc(ci)} LIMIT 1)")
        # state_province
        sp = row.get("state_province", "").strip()
        sql_fields.append("state_province"); sql_vals.append(esc(sp) if sp else "NULL")
        # location
        lat = row.get("latitude", "").strip()
        lng = row.get("longitude", "").strip()
        sql_fields.append("location")
        sql_vals.append(f"ST_SetSRID(ST_MakePoint({lng}, {lat}), 4326)")
        # tonnage_mt
        sql_fields.append("tonnage_mt"); sql_vals.append(safe_float(row.get("tonnage_mt", "")))
        # tonnage_grade_pct
        sql_fields.append("tonnage_grade_pct"); sql_vals.append(safe_float(row.get("tonnage_grade_pct", "")))
        # tonnage_confidence
        tc2 = row.get("tonnage_confidence", "").strip()
        sql_fields.append("tonnage_confidence"); sql_vals.append(esc(tc2) if tc2 else "NULL")
        # status
        st = (row.get("status") or "unknown").strip()
        sql_fields.append("status"); sql_vals.append(esc(st))
        # discovery_year
        sql_fields.append("discovery_year"); sql_vals.append(safe_int(row.get("discovery_year", "")))
        # production_start_year
        sql_fields.append("production_start_year"); sql_vals.append(safe_int(row.get("production_start_year", "")))
        # operator_company
        op = row.get("operator_company", "").strip()
        sql_fields.append("operator_company"); sql_vals.append(esc(op) if op else "NULL")
        # mining_method
        mm = row.get("mining_method", "").strip()
        sql_fields.append("mining_method"); sql_vals.append(esc(mm) if mm else "NULL")
        # host_rock_type
        hr = row.get("host_rock_type", "").strip()
        sql_fields.append("host_rock_type"); sql_vals.append(esc(hr) if hr else "NULL")
        # host_rock_age_text
        at = row.get("host_rock_age_text", "").strip()
        sql_fields.append("host_rock_age_text"); sql_vals.append(esc(at) if at else "NULL")
        # tectonic_setting
        ts = row.get("tectonic_setting", "").strip()
        sql_fields.append("tectonic_setting"); sql_vals.append(esc(ts) if ts else "NULL")
        # geological_province
        gp = row.get("geological_province", "").strip()
        sql_fields.append("geological_province"); sql_vals.append(esc(gp) if gp else "NULL")
        # metallogenic_belt
        mb = row.get("metallogenic_belt", "").strip()
        sql_fields.append("metallogenic_belt"); sql_vals.append(esc(mb) if mb else "NULL")
        # summary_en
        se = row.get("summary_en", "").strip()
        sql_fields.append("summary_en"); sql_vals.append(esc_dollar(se) if se else "NULL")
        # data_source
        ds = (row.get("data_source") or "").strip()
        sql_fields.append("data_source"); sql_vals.append(esc(ds))
        # data_quality_score
        sql_fields.append("data_quality_score"); sql_vals.append(safe_int(row.get("data_quality_score", "")))
        # is_featured
        sql_fields.append("is_featured"); sql_vals.append(safe_bool(row.get("is_featured", "")))
        # tags
        sql_fields.append("tags"); sql_vals.append(arr(parse_array(row.get("tags", ""))))
        # reference_dois
        sql_fields.append("reference_dois"); sql_vals.append(arr(parse_array(row.get("sources_doi", ""))))
        # last_verified_date
        lvd = row.get("last_verified_date", "").strip()
        sql_fields.append("last_verified_date"); sql_vals.append(esc(lvd) if lvd else "NULL")
        # is_public, is_active
        sql_fields.append("is_public"); sql_vals.append("true")
        sql_fields.append("is_active"); sql_vals.append("true")

        cols = ", ".join(sql_fields)
        vals = ",\n            ".join(sql_vals)

        sql_stmt = f"""INSERT INTO deposits ({cols})
VALUES (
            {vals}
        )
ON CONFLICT (slug) DO UPDATE SET
    tonnage_mt = EXCLUDED.tonnage_mt,
    tonnage_grade_pct = EXCLUDED.tonnage_grade_pct,
    status = EXCLUDED.status,
    operator_company = EXCLUDED.operator_company,
    data_source = EXCLUDED.data_source,
    data_quality_score = EXCLUDED.data_quality_score,
    updated_at = NOW()"""

        success, msg = exec_sql(sql_stmt)
        if success:
            ok += 1
        elif any(kw in msg.lower() for kw in ["duplicate", "already exists", "violates unique"]):
            skip += 1
        else:
            fail += 1
            if fail <= 8:
                print(f"  FAIL [{name}]: {msg[:250]}")

        if (i + 1) % 20 == 0:
            print(f"  [{i+1}/100] ok={ok} skip={skip} fail={fail}")

    print(f"\nImport complete: {ok} OK, {skip} skip, {fail} fail / {len(rows)}")

    # Final count
    s, _ = exec_sql("SELECT COUNT(*) as c FROM deposits WHERE is_active = true AND primary_mineral = 'copper'")
    print(f"Done.")

if __name__ == "__main__":
    main()
