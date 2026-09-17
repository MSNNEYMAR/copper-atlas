"""Execute Supabase SQL via Management API."""
import json, os, sys
import urllib.request as u

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
URL = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def run_one(stmt):
    data = json.dumps({"query": stmt}).encode("utf-8")
    req = u.Request(URL, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        u.urlopen(req, timeout=30)
        return "OK"
    except u.HTTPError as e:
        body = e.read().decode(errors="replace")[:200]
        for kw in ["already exists", "duplicate", "relation", "does not exist"]:
            if kw in body.lower():
                return "SKIP"
        return f"FAIL:{e.code}:{body}"
    except Exception as e:
        return f"ERR:{e}"

def run_file(sql_path):
    with open(sql_path, "r", encoding="utf-8") as f:
        content = f.read()
    stmts = []
    buf = []
    for line in content.split("\n"):
        s = line.strip()
        if s.startswith("--"):
            continue
        buf.append(line)
        if s.endswith(";") and not s.endswith("$$;"):
            stmt = "\n".join(buf).strip().rstrip(";")
            if len(stmt) > 15:
                stmts.append(stmt)
            buf = []
    if buf:
        stmt = "\n".join(buf).strip().rstrip(";")
        if len(stmt) > 15:
            stmts.append(stmt)

    ok = 0
    skip = 0
    fail = 0
    for i, s in enumerate(stmts):
        r = run_one(s)
        if r == "OK":
            ok += 1
        elif r == "SKIP":
            skip += 1
        else:
            fail += 1
            if fail <= 5:
                print(f"  FAIL [{i}]: {s.strip()[:80]}... -> {r}")

    name = os.path.basename(sql_path)
    print(f"  {name}: {ok} OK, {skip} skip, {fail} fail")
    return fail

if __name__ == "__main__":
    total_fail = 0
    for path in sys.argv[1:]:
        total_fail += run_file(path)
    print(f"\nTotal failures: {total_fail}")
    sys.exit(1 if total_fail > 0 else 0)
