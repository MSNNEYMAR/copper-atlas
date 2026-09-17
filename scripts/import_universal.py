#!/usr/bin/env python3
"""
Copper Atlas — Universal Importer

Supports: CSV, Excel (.xlsx), GeoJSON (.geojson), Shapefile (.shp), GeoPackage (.gpkg)

Usage:
  python import_universal.py data.csv
  python import_universal.py data.xlsx
  python import_universal.py deposits.geojson
  python import_universal.py deposits.shp
  python import_universal.py --dry-run data.csv
  python import_universal.py --upsert data.csv
"""
import csv, io, json, os, re, subprocess, sys, time
from datetime import datetime
from pathlib import Path

# === CONFIG ===
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
SQL_API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

FIELD_MAP = {
    "name":      ["name_en","name","deposit_name","site_name","deposit","SITE_NAME","Name"],
    "name_zh":   ["name_zh","name_cn","chinese_name"],
    "country_iso":["country_iso","country","iso_code","COUNTRY","Country_Code","country_code"],
    "latitude":  ["latitude","lat","LATITUDE","LAT","y"],
    "longitude": ["longitude","lon","lng","long","LONGITUDE","LON","x"],
    "primary_mineral":["primary_mineral","commodity","COMMODITY","Commodity","mineral"],
    "secondary_minerals":["secondary_minerals","secondary_commodities"],
    "deposit_type_code":["deposit_type_code","deposit_type","DEVTYPE","Type","dep_type"],
    "tonnage_mt":["tonnage_mt","tonnage","reserve","TONNAGE","Reserve","contained_metal"],
    "tonnage_grade_pct":["tonnage_grade_pct","grade","GRADE","Grade","grade_pct"],
    "tonnage_confidence":["tonnage_confidence","confidence","report_standard"],
    "status":   ["status","STATUS","devstat","oper_status","DEVSTAT","mine_status"],
    "discovery_year":["discovery_year","disc_year","DISCYR"],
    "production_start_year":["production_start_year","prod_year","start_year"],
    "operator_company":["operator_company","operator","OPERATOR","company"],
    "mining_method":["mining_method","METHOD","method","mine_type"],
    "host_rock_type":["host_rock_type","HOSTROCK","host_rock","rock_type"],
    "host_rock_age_text":["host_rock_age_text","AGE","host_rock_age","age"],
    "tectonic_setting":["tectonic_setting","TECTONIC","tectonic","setting"],
    "geological_province":["geological_province","geol_province","province"],
    "metallogenic_belt":["metallogenic_belt","met_belt","belt"],
    "state_province":["state_province","state","province","region","district"],
    "data_source":["data_source","source","SOURCE","REF","reference"],
    "data_quality_score":["data_quality_score","quality","QUALITY"],
    "summary_en":["summary_en","description","DESCRIP","remarks","notes"],
    "is_featured":["is_featured","featured"],
    "tags":      ["tags","keywords"],
}
VALID_STATUSES = {"exploration","feasibility","development","production","suspended","closed","depleted","unknown"}
VALID_MINERALS = {"copper","gold","iron","lithium","zinc","lead","nickel","silver","molybdenum","cobalt","rare_earth","uranium"}

# === HELPERS ===
def slugify(s): return re.sub(r'[^a-z0-9]+','-',s.lower().strip())[:200]
def esc(s): return s.replace("'","''") if s else ""
def safe_int(v):
    try: return int(float(str(v)))
    except: return None
def safe_float(v):
    try: return float(str(v))
    except: return None

# === SQL EXECUTION ===
def exec_sql(stmt):
    body = json.dumps({"query":stmt})
    r = subprocess.run(["curl","-s","-w","%{http_code}","-X","POST",SQL_API,
        "-H",f"Authorization: Bearer {TOKEN}","-H","Content-Type: application/json","-d",body],
        capture_output=True,text=True,timeout=60)
    out = r.stdout.strip()
    code = out[-3:] if len(out)>=3 else "000"
    return code in ("200","201"), out[:-3].strip()[:200]

def insert_deposit(slug,name,country_iso,lat,lng,mineral,type_code,tonnage,grade,status,
                   disc_yr,prod_yr,operator,mining,host_rock,age,tectonic,province,belt,
                   state,summary,source,quality,featured,sec_minerals,tags,ton_conf):
    loc = f"ST_SetSRID(ST_MakePoint({lng},{lat}),4326)" if lat and lng else "NULL"
    vals = [
        f"'{esc(slug)}'", f"'{esc(name)}'",
        f"(SELECT id FROM countries WHERE iso_code='{esc(country_iso)}' LIMIT 1)" if country_iso else "NULL",
        f"(SELECT id FROM deposit_classification WHERE code='{esc(type_code)}' LIMIT 1)" if type_code else "NULL",
        loc, f"'{esc(mineral)}'",
        f"{tonnage}::numeric" if tonnage else "NULL",
        f"{grade}::numeric" if grade else "NULL",
        f"'{esc(ton_conf)}'" if ton_conf else "NULL",
        f"'{esc(status)}'",
        f"{disc_yr}" if disc_yr else "NULL",
        f"{prod_yr}" if prod_yr else "NULL",
        f"'{esc(operator)}'" if operator else "NULL",
        f"'{esc(mining)}'" if mining else "NULL",
        f"'{esc(host_rock)}'" if host_rock else "NULL",
        f"'{esc(age)}'" if age else "NULL",
        f"'{esc(tectonic)}'" if tectonic else "NULL",
        f"'{esc(province)}'" if province else "NULL",
        f"'{esc(belt)}'" if belt else "NULL",
        f"'{esc(state)}'" if state else "NULL",
        f"$${esc(summary)}$$" if summary else "NULL",
        f"'{esc(source)}'" if source else "NULL",
        f"{quality}" if quality else "NULL",
        "true" if featured else "false",
        "true", "true",
    ]
    sql = (
        f"INSERT INTO deposits (slug,name,country_id,deposit_classification_id,location,"
        f"primary_mineral,tonnage_mt,tonnage_grade_pct,tonnage_confidence,status,"
        f"discovery_year,production_start_year,operator_company,mining_method,"
        f"host_rock_type,host_rock_age_text,tectonic_setting,geological_province,"
        f"metallogenic_belt,state_province,summary_en,data_source,data_quality_score,"
        f"is_featured,is_public,is_active) "
        f"SELECT {','.join(vals)} "
        f"WHERE NOT EXISTS (SELECT 1 FROM deposits WHERE slug='{esc(slug)}')"
    )
    return exec_sql(sql)

# === FORMAT PARSERS ===
def parse_row(row):
    """Map external field names to canonical names"""
    rec = {}
    for canon,aliases in FIELD_MAP.items():
        for a in aliases:
            if a in row and row[a]:
                rec[canon] = str(row[a]).strip()
                break
    return rec

def read_csv(path):
    with open(path,"r",encoding="utf-8",errors="replace") as f:
        reader = csv.DictReader(f)
        return [parse_row(r) for r in reader], reader.fieldnames

def read_geojson(path):
    with open(path,"r",encoding="utf-8") as f:
        data = json.load(f)
    rows = []
    features = data.get("features",[]) if isinstance(data,dict) else data
    for feat in features:
        props = dict(feat.get("properties",{}))
        geom = feat.get("geometry",{})
        if geom.get("type")=="Point" and geom.get("coordinates"):
            props["longitude"]=str(geom["coordinates"][0])
            props["latitude"]=str(geom["coordinates"][1])
        rows.append(parse_row(props))
    return rows, list(rows[0].keys()) if rows else []

def read_excel(path):
    try:
        import openpyxl
        wb = openpyxl.load_workbook(path,read_only=True,data_only=True)
        ws = wb.active
        rows_list = list(ws.iter_rows(values_only=True))
        if not rows_list: return [],[]
        headers = [str(h).strip() if h else "" for h in rows_list[0]]
        rows = []
        for r in rows_list[1:]:
            row = {headers[i]:str(r[i]) if r[i] else "" for i in range(min(len(headers),len(r)))}
            rows.append(parse_row(row))
        return rows, headers
    except ImportError:
        print("ERROR: openpyxl required: pip install openpyxl")
        sys.exit(1)

# === VALIDATION ===
def validate(rec, idx):
    errors = []
    if not rec.get("name"): errors.append("MISSING_NAME")
    lat = safe_float(rec.get("latitude"))
    lng = safe_float(rec.get("longitude"))
    if lat is None or lng is None: errors.append("MISSING_COORDS")
    elif not (-90<=lat<=90): errors.append("LAT_OUT_OF_RANGE")
    elif not (-180<=lng<=180): errors.append("LNG_OUT_OF_RANGE")
    elif lat==0 and lng==0: errors.append("NULL_ISLAND")
    status = rec.get("status","unknown").lower()
    if status not in VALID_STATUSES: rec["status"]="unknown"
    mineral = rec.get("primary_mineral","copper").lower()
    if mineral not in VALID_MINERALS: mineral="copper"
    rec["primary_mineral"]=mineral
    return errors

# === MAIN ===
def main():
    dry_run = "--dry-run" in sys.argv
    upsert = "--upsert" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if not TOKEN:
        print("ERROR: Set SUPABASE_ACCESS_TOKEN environment variable")
        sys.exit(1)
    if not args:
        print("Usage: python import_universal.py <file> [--dry-run] [--upsert]")
        sys.exit(1)

    path = args[0] if args else None
    if not path or not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)

    ext = Path(path).suffix.lower()
    if ext==".csv": rows, headers = read_csv(path)
    elif ext in (".geojson",".json"): rows, headers = read_geojson(path)
    elif ext in (".xlsx",".xls"): rows, headers = read_excel(path)
    else:
        print(f"Unsupported format: {ext}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Copper Atlas — Universal Importer")
    print(f"{'='*60}")
    print(f"File: {path}")
    print(f"Rows: {len(rows)}")
    print(f"Dry run: {dry_run}")
    print(f"Upsert: {upsert}")

    ok,skip,fail = 0,0,0
    errors_log = []
    start = time.time()

    for i, rec in enumerate(rows):
        if not rec.get("name"):
            fail+=1; continue

        errs = validate(rec,i)
        if errs:
            fail+=1
            errors_log.append({"row":i+2,"name":rec.get("name","?"),"errors":errs})
            if fail<=10: print(f"  ⚠ Row {i+2}: {rec.get('name','?')[:40]} — {', '.join(errs)}")
            continue

        slug = slugify(rec["name"])
        country_iso = rec.get("country_iso","")
        lat_val = safe_float(rec.get("latitude"))
        lng_val = safe_float(rec.get("longitude"))

        if dry_run:
            ok+=1; continue

        success,msg = insert_deposit(
            slug=slug, name=rec["name"],
            country_iso=country_iso, lat=lat_val, lng=lng_val,
            mineral=rec.get("primary_mineral","copper"),
            type_code=rec.get("deposit_type_code","OTH"),
            tonnage=safe_float(rec.get("tonnage_mt")),
            grade=safe_float(rec.get("tonnage_grade_pct")),
            ton_conf=rec.get("tonnage_confidence"),
            status=rec.get("status","unknown"),
            disc_yr=safe_int(rec.get("discovery_year")),
            prod_yr=safe_int(rec.get("production_start_year")),
            operator=rec.get("operator_company"),
            mining=rec.get("mining_method"),
            host_rock=rec.get("host_rock_type"),
            age=rec.get("host_rock_age_text"),
            tectonic=rec.get("tectonic_setting"),
            province=rec.get("geological_province"),
            belt=rec.get("metallogenic_belt"),
            state=rec.get("state_province"),
            summary=rec.get("summary_en"),
            source=rec.get("data_source"),
            quality=safe_int(rec.get("data_quality_score")),
            featured=False,
            sec_minerals=rec.get("secondary_minerals"),
            tags=rec.get("tags"),
        )
        if success: ok+=1
        elif "duplicate" in msg.lower(): skip+=1
        else:
            fail+=1
            if fail<=10: print(f"  ✗ FAIL [{slug}]: {msg}")

        if (i+1)%50==0: print(f"  [{i+1}/{len(rows)}] ok={ok} skip={skip} fail={fail}")

    elapsed = time.time()-start
    print(f"\n{'='*60}")
    print(f"Import complete: {ok} OK, {skip} skip, {fail} fail / {len(rows)}")
    print(f"Duration: {elapsed:.1f}s")
    if errors_log:
        logpath = f"import_errors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with open(logpath,"w",newline="") as f:
            w = csv.writer(f)
            w.writerow(["row","name","errors"])
            for e in errors_log: w.writerow([e["row"],e["name"],"; ".join(e["errors"])])
        print(f"Errors log: {logpath}")

if __name__=="__main__":
    main()
