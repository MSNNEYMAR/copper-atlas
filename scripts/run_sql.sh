#!/usr/bin/env bash
set -e
TOKEN="${SUPABASE_ACCESS_TOKEN}"
API="https://api.supabase.com/v1/projects/aamagslubcfodgeiiqor/database/query"
SQL_DIR="$HOME/copper-atlas/docker/postgres/init"
SEED_DIR="$HOME/copper-atlas/data/seeds"

echo "=== Copper Atlas - Database Setup ==="
echo ""

run_file() {
    local f="$1"
    local name=$(basename "$f")
    printf "  %-35s " "$name"

    # Read file, strip comments, collapse whitespace
    local sql=$(grep -v '^\s*--' "$f" | tr '\n' ' ')

    # Use python to JSON-encode the SQL
    local json=$(echo "$sql" | py -3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)
    if [ -z "$json" ]; then
        echo "SKIP (empty)"
        return
    fi

    # Send via curl
    local resp=$(curl -s -w "%{http_code}" -X POST "$API" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$json" 2>/dev/null)

    local code="${resp: -3}"
    if [ "$code" = "200" ] || [ "$code" = "201" ]; then
        echo "OK"
    else
        echo "WARN (HTTP $code)"
    fi
}

for f in "$SQL_DIR"/*.sql; do
    run_file "$f"
done

for f in "$SEED_DIR"/*.sql; do
    [ -f "$f" ] && run_file "$f"
done

echo ""
echo "=== Database setup complete ==="
