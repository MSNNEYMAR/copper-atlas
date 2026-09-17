"""Seed copper deposits. Uses bracket-aware parsing to find complete INSERT statements."""
import json, os, re, subprocess, sys

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def exec_sql(stmt):
    body = json.dumps({"query": stmt})
    result = subprocess.run([
        "curl", "-s", "-w", "%{http_code}", "-X", "POST", API,
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", body,
    ], capture_output=True, text=True, timeout=60)
    out = result.stdout.strip()
    code = out[-3:] if len(out) >= 3 else "000"
    return code in ("200", "201"), out[:-3].strip()

def find_statements(content):
    """Find INSERT statements. Uses a simple state machine to track
    single-quoted strings so semicolons inside strings are ignored."""
    stmts = []
    in_string = False
    start = -1
    i = 0

    while i < len(content):
        ch = content[i]

        if in_string:
            if ch == "'":
                if i + 1 < len(content) and content[i + 1] == "'":
                    i += 2  # Skip the escaped quote (two single quotes = one quote)
                    continue
                in_string = False
        elif ch == "'":
            in_string = True
        elif start == -1 and i + 6 <= len(content) and content[i:i+6].upper() == 'INSERT':
            start = i
        elif ch == ';' and start >= 0:
            stmt = content[start:i].strip()
            if len(stmt) > 50:
                stmts.append(stmt)
            start = -1

        i += 1

    if start >= 0:
        stmt = content[start:].strip().rstrip(';')
        if len(stmt) > 50:
            stmts.append(stmt)

    return stmts

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "C:/Users/18074/copper-atlas/data/seeds/04_copper_deposits.sql"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    stmts = find_statements(content)
    print(f"Found {len(stmts)} INSERT statements\n")

    ok, skip, fail = 0, 0, 0
    for i, s in enumerate(stmts):
        success, msg = exec_sql(s)
        if success:
            ok += 1
        elif any(kw in msg.lower() for kw in ["already exists", "duplicate"]):
            skip += 1
        else:
            fail += 1
            if fail <= 3:
                m = re.search(r"SELECT '([^']+)'", s)
                name = m.group(1) if m else f"stmt #{i}"
                print(f"  FAIL [{name}]: {msg[:250]}")

        if (i + 1) % 5 == 0:
            print(f"  [{i+1}/{len(stmts)}] ok={ok} skip={skip} fail={fail}")

    print(f"\nTotal: {ok} ok, {skip} skip, {fail} fail / {len(stmts)}")
    sys.exit(1 if fail > 0 else 0)

if __name__ == "__main__":
    main()
