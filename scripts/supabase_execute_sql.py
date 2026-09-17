#!/usr/bin/env python3
"""
Execute SQL files against Supabase project via Management API.
Usage: python supabase_execute_sql.py <sql_file_or_directory>
"""
import os, sys, re, json, urllib.request

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "aamagslubcfodgeiiqor")

if not TOKEN:
    print("ERROR: Set SUPABASE_ACCESS_TOKEN")
    sys.exit(1)

API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def execute_sql(statement: str) -> bool:
    """Execute a single SQL statement via Supabase Management API."""
    statement = statement.strip()
    if not statement or statement.startswith("--"):
        return True
    try:
        data = json.dumps({"query": statement}).encode("utf-8")
        req = urllib.request.Request(API_URL, data=data, method="POST")
        req.add_header("Authorization", f"Bearer {TOKEN}")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=30) as resp:
            pass
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if "already exists" in body.lower() or "duplicate" in body.lower():
            return True  # Idempotent: ok if already exists
        print(f"  ERROR [{e.code}]: {body[:200]}")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def split_sql(content: str) -> list[str]:
    """Split SQL content into individual statements, skipping comments."""
    statements = []
    current = []
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        if not stripped:
            if current:
                current.append("")
            continue
        current.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(current).strip().rstrip(";")
            if stmt and not stmt.startswith("--"):
                statements.append(stmt)
            current = []
    if current:
        stmt = "\n".join(current).strip().rstrip(";")
        if stmt:
            statements.append(stmt)
    return statements

def main():
    paths = sys.argv[1:] if len(sys.argv) > 1 else []
    if not paths:
        print("Usage: python supabase_execute_sql.py <file1.sql> <file2.sql> ...")
        sys.exit(1)

    # Collect all files
    files = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, filenames in sorted(os.walk(p)):
                for f in sorted(f for f in filenames if f.endswith(".sql")):
                    files.append(os.path.join(root, f))
        else:
            files.append(p)

    success, fail, total = 0, 0, 0
    for fpath in files:
        print(f"\n▶ {os.path.basename(fpath)}")
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        stmts = split_sql(content)
        for i, stmt in enumerate(stmts):
            # Skip empty/incomplete statements
            if len(stmt) < 10:
                continue
            total += 1
            preview = stmt[:80].replace("\n", " ").strip()
            if not execute_sql(stmt):
                fail += 1
                print(f"  FAILED: {preview}...")
            else:
                success += 1
        print(f"  → {len(stmts)} statements")

    print(f"\n{'='*60}")
    print(f"Results: {success} OK, {fail} FAILED, {total} total")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
