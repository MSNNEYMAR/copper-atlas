"""
Convert USGS MRDS CSV files (from Global-copper-deposit-dataset) to Copper Atlas import format.
Outputs valid CSV-importable files with slug-based dedup against existing DB.
"""
import csv, os, re, subprocess, json, sys

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
SQL_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def slugify(s): return re.sub(r'[^a-z0-9]+','-',s.lower().strip())[:200]
def esc(s): return s.replace("'","''") if s else ""
def safe_float(v):
    try: return float(str(v))
    except: return None
def safe_int(v):
    try: return int(float(str(v)))
    except: return None

def exec_sql(stmt):
    body = json.dumps({"query":stmt})
    r = subprocess.run(["curl","-s","-w","%{http_code}","-X","POST",SQL_API,
        "-H",f"Authorization: Bearer {TOKEN}","-H","Content-Type: application/json","-d",body],
        capture_output=True,text=True,timeout=60)
    out = r.stdout.strip()
    code = out[-3:] if len(out)>=3 else "000"
    return code in ("200","201")

# USGS MRDS deposit type → our classification code
TYPE_MAP = {
    'Porphyry Cu': 'POR_CUMO', 'Porphyry Cu-Mo': 'POR_CUMO', 'Porphyry Cu-Au': 'POR_CUAU',
    'Porphyry Cu, Mo': 'POR_CUMO', 'Porphyry Cu, Au': 'POR_CUAU',
    'Sediment-hosted Cu': 'SED_SSC', 'Sediment-hosted Stratiform Copper': 'SED_SSC',
    'Kupferschiefer': 'SED_SSC', 'Red-bed Cu': 'SED_SSC',
    'VMS': 'VMS_BM', 'Volcanogenic massive sulfide': 'VMS_BM',
    'Besshi': 'VMS_PM', 'Cyprus': 'VMS_BM', 'Kuroko': 'VMS_BF',
}

def map_type(deptype: str) -> str:
    dt = (deptype or '').strip()
    for k, v in TYPE_MAP.items():
        if k.lower() in dt.lower(): return v
    return 'OTH'

def import_row(row: dict, batch_num: int) -> bool:
    name = (row.get('depname') or '').strip()
    if not name: return False

    slug = slugify(name)
    country_iso = (row.get('cntrycd') or row.get('country') or '').strip()[:2].upper()
    lat = safe_float(row.get('latitude'))
    lng = safe_float(row.get('longitude'))

    # Skip obviously invalid entries
    if not country_iso or lat is None or lng is None: return False
    if lat == 0 and lng == 0: return False
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180): return False

    grade = safe_float(row.get('cugrd'))
    oreton = safe_float(row.get('oreton'))
    # oreton is typically metric tonnes of ore, NOT contained metal
    # For porphyry deposits: oreton * grade/100 ≈ contained metal
    tonnage_mt = None
    if oreton and grade:
        tonnage_mt = (oreton * grade / 100) / 1_000_000  # tonnes * grade% → Mt contained
    elif oreton and oreton > 1_000_000:
        tonnage_mt = oreton / 1_000_000  # If no grade, assume it might be contained metal
    elif oreton:
        tonnage_mt = oreton / 1_000_000

    status = 'unknown'
    discovery_year = safe_int(row.get('discyr')) or safe_int(row.get('agemy'))
    state = (row.get('stprov') or '').strip()
    dep_type = map_type(row.get('deptype') or '')
    # Use batch number in slug for dedup if needed
    data_source = row.get('data_source') or row.get('source') or 'USGS MRDS'

    sql = f"""
    INSERT INTO deposits (slug,name,country_id,deposit_classification_id,location,
        primary_mineral,tonnage_mt,tonnage_grade_pct,status,discovery_year,state_province,
        data_source,data_quality_score,is_public,is_active,host_rock_type,host_rock_age_text)
    SELECT '{esc(slug)}','{esc(name)}',
        (SELECT id FROM countries WHERE iso_code='{esc(country_iso)}' LIMIT 1),
        (SELECT id FROM deposit_classification WHERE code='{dep_type}' LIMIT 1),
        ST_SetSRID(ST_MakePoint({lng},{lat}),4326),
        'copper',{f'{tonnage_mt}::numeric' if tonnage_mt else 'NULL'},
        {f'{grade}::numeric' if grade else 'NULL'},'{esc(status)}',
        {discovery_year if discovery_year else 'NULL'},
        '{esc(state)}','USGS MRDS - {esc(data_source)[:400]}',3,true,true,
        '{esc((row.get('rockdep') or '')[:300])}','{esc((row.get('depage') or '')[:200])}'
    WHERE NOT EXISTS (SELECT 1 FROM deposits WHERE slug='{esc(slug)}')
    """
    return exec_sql(sql)

def main():
    src_dir = os.path.expanduser("~/copper-atlas/data/tmp_gh")
    if not TOKEN:
        print("ERROR: Set SUPABASE_ACCESS_TOKEN")
        sys.exit(1)

    total, ok, skip, fail = 0, 0, 0, 0
    files = {
        'USGS_MRDS_Porphyry_copper_deposit.csv': 'POR',
        'USGS_MRDS_Sed_copper_deposit.csv': 'SED',
        'USGS_MRDS_VMS_deposit.csv': 'VMS',
    }

    for fname, batch_label in files.items():
        fpath = os.path.join(src_dir, fname)
        if not os.path.exists(fpath):
            print(f"  SKIP {fname} — not found")
            continue
        print(f"\n  ▶ {fname}")
        with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                total += 1
                if import_row(row, total):
                    ok += 1
                else:
                    skip += 1
                if (total % 100) == 0:
                    print(f"    [{total}] ok={ok} skip={skip}")
        print(f"    {fname}: {ok} OK, {skip} skip")

    print(f"\n  Done: {ok} imported, {skip} skipped / {total} total")

if __name__ == "__main__":
    main()
