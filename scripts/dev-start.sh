#!/usr/bin/env bash
# ============================================================================
# Copper Atlas — Local Development Quick Start
# 全局铜矿床图谱 — 本地开发一键启动
# ============================================================================
set -e

echo "============================================"
echo " Copper Atlas — Dev Environment Setup"
echo " 全局铜矿床图谱 — 开发环境启动"
echo "============================================"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Step 1: Install frontend dependencies
echo ""
echo "[1/5] Installing frontend dependencies..."
pnpm install --no-frozen-lockfile 2>/dev/null || npm install 2>/dev/null

# Step 2: Install backend dependencies
echo "[2/5] Installing backend dependencies..."
cd apps/api
pip install -e ".[dev]" 2>/dev/null || pip install fastapi uvicorn sqlalchemy asyncpg geoalchemy2 pydantic pydantic-settings structlog httpx orjson
cd "$ROOT"

# Step 3: Start Docker services (database + martin + redis)
echo "[3/5] Starting Docker services..."
if command -v docker &> /dev/null; then
    docker compose -f docker/docker-compose.yml up -d postgres martin redis 2>/dev/null || \
        echo "  Docker not available — run database externally"
else
    echo "  Docker not found. Start PostgreSQL+PostGIS manually."
fi

# Step 4: Run database migrations
echo "[4/5] Running database migrations..."
cd apps/api
if [ -n "${DATABASE_URL_SYNC:-}" ]; then
    alembic upgrade head 2>/dev/null || echo "  Migration skipped (database not available)"
else
    alembic upgrade head 2>/dev/null || echo "  Migration skipped (set DATABASE_URL_SYNC first)"
fi
cd "$ROOT"

# Step 5: Seed data
echo "[5/5] Seeding reference data..."
python data/import_scripts/seed_all.py 2>/dev/null || \
    echo "  Seeding skipped (database not available)"

# Start dev servers
echo ""
echo "============================================"
echo " Starting development servers..."
echo "============================================"
echo ""
echo "  Frontend:  http://localhost:3001/en/map"
echo "  Backend:   http://localhost:8000/docs"
echo "  Tiles:     http://localhost:3000/catalog"
echo ""
echo " Press Ctrl+C to stop all servers"
echo ""

# Start frontend and backend in parallel
cd "$ROOT/apps/web"
pnpm dev &
WEB_PID=$!

cd "$ROOT/apps/api"
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

# Trap to clean up on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $WEB_PID 2>/dev/null || true
    kill $API_PID 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Wait for either process to exit
wait
