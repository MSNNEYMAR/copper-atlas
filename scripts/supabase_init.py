"""Initialize Supabase database. Smart SQL splitter respecting strings and dollar-quotes."""
import json, os, re, subprocess, sys

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = "aamagslubcfodgeiiqor"
API = f"https://api.supabase.com/v1/projects/{REF}/database/query"

def split_sql(content):
    """Split SQL into statements, respecting strings and $$ quoting."""
    # Step 1: protect dollar-quoted blocks FIRST (so strings inside $$ are preserved)
    dollars = []
    def save_dollar(m):
        dollars.append(m.group(0))
        return f"__DOL_{len(dollars) - 1}__"
    content = re.sub(r'\$[A-Za-z]*\$.*?\$[A-Za-z]*\$', save_dollar, content, flags=re.DOTALL)

    # Step 2: protect single-quoted strings (after removing dollar blocks)
    strings = []
    def save_string(m):
        strings.append(m.group(0))
        return f"__STR_{len(strings) - 1}__"
    content = re.sub(r"'([^']|'')*'", save_string, content)

    # Step 3: split on semicolons
    parts = content.split(";")
    stmts = []
    for part in parts:
        s = part.strip()
        # Restore in reverse order: strings first, then dollars
        for i, val in enumerate(strings):
            s = s.replace(f"__STR_{i}__", val)
        for i, val in enumerate(dollars):
            s = s.replace(f"__DOL_{i}__", val)
        if len(s) > 15:
            stmts.append(s)

    return stmts

def exec_stmt(stmt):
    body = json.dumps({"query": stmt})
    result = subprocess.run([
        "curl", "-s", "-w", "%{http_code}", "-X", "POST", API,
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", body,
    ], capture_output=True, text=True, timeout=30)
    out = result.stdout.strip()
    code = out[-3:] if len(out) >= 3 else "???"
    if code in ("200", "201"):
        return True, ""
    resp = out[:-3].strip()
    return False, f"HTTP {code}: {resp[:150]}"

def run_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove pure comment lines first
    lines = [l for l in content.split("\n") if not l.strip().startswith("--")]
    content = "\n".join(lines)

    stmts = split_sql(content)
    ok, skip, fail = 0, 0, 0

    for i, s in enumerate(stmts):
        if len(s) < 10:
            continue
        success, msg = exec_stmt(s)
        if success:
            ok += 1
        elif any(kw in msg.lower() for kw in
                 ["already exists", "duplicate", "does not exist",
                  "cannot drop", "no data", "no rows"]):
            skip += 1
        else:
            fail += 1
            if fail <= 5:
                preview = s.strip()[:120].replace("\n", " ")
                print(f"  [{i}] FAIL: {preview}... -> {msg}")

    name = os.path.basename(path)
    print(f"  {name}: {ok} ok, {skip} skip, {fail} fail")
    return fail

def main():
    paths = sys.argv[1:]
    total = sum(run_file(p) for p in paths)
    print(f"\nTotal failures: {total}")
    sys.exit(1 if total > 0 else 0)

if __name__ == "__main__":
    main()
