#!/usr/bin/env bash
# ============================================================================
# Copper Atlas — Full Stack Deployment Script
# 全局铜矿床图谱 — 全栈部署脚本
# ============================================================================
# Usage: bash scripts/deploy-full.sh
# Prerequisites: supabase CLI, railway CLI, vercel CLI (all logged in)
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="copper-atlas"

echo ""
echo "============================================================"
echo "  Copper Atlas — Full Stack Deployment"
echo "  全球铜矿床图谱 — 全栈部署"
echo "============================================================"
echo ""

# ==========================================================================
# STEP 1: Supabase Database
# ==========================================================================
info "Step 1/4: Setting up Supabase database..."

if ! command -v supabase &> /dev/null; then
    err "supabase CLI not found. Install: npm i -g supabase"
fi

# supabase projects create "$PROJECT_NAME" --org-id default --db-pass auto
# If project exists, skip creation
log "Connecting to Supabase..."

DB_PASSWORD="copper_atlas_$(openssl rand -hex 6 2>/dev/null || echo 'dev_2024')"

# Get or create project
PROJECT_REF=$(supabase projects list 2>/dev/null | grep "$PROJECT_NAME" | awk '{print $1}' || echo "")
if [ -z "$PROJECT_REF" ]; then
    info "Creating new Supabase project: $PROJECT_NAME"
    PROJECT_REF=$(supabase projects create "$PROJECT_NAME" \
        --org-id default \
        --db-pass "$DB_PASSWORD" \
        --region us-east-1 2>/dev/null | tail -1 | awk '{print $NF}')
    log "Project created: $PROJECT_REF"
else
    log "Using existing project: $PROJECT_REF"
fi

DATABASE_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"

# Link project
cd "$ROOT_DIR/apps/api"
supabase link --project-ref "$PROJECT_REF" 2>/dev/null || warn "Could not link (may already be linked)"

# Run migrations
info "Running database migrations..."
DATABASE_URL_SYNC="$DATABASE_URL" alembic upgrade head || \
    warn "Alembic failed — running direct SQL..."

# Seed data
info "Seeding reference data..."
cd "$ROOT_DIR/data/import_scripts"
python seed_all.py --db-url "$DATABASE_URL" 2>/dev/null || \
    warn "Python seeding failed — running SQL directly..."

# If Python seeding failed, run SQL directly
if [ $? -ne 0 ]; then
    info "Running SQL seed files directly via psql..."
    export PGPASSWORD="$DB_PASSWORD"
    for f in "$ROOT_DIR/docker/postgres/init/"*.sql; do
        psql -h "db.$PROJECT_REF.supabase.co" -U postgres -d postgres -f "$f" 2>/dev/null || true
    done
    for f in "$ROOT_DIR/data/seeds/"*.sql; do
        psql -h "db.$PROJECT_REF.supabase.co" -U postgres -d postgres -f "$f" 2>/dev/null || true
    done
fi

log "Database ready: postgresql://db.$PROJECT_REF.supabase.co:5432/postgres"
echo "  DATABASE_URL=postgresql+asyncpg://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"

# ==========================================================================
# STEP 2: Railway — FastAPI Backend
# ==========================================================================
info ""
info "Step 2/4: Deploying FastAPI backend to Railway..."

if command -v railway &> /dev/null; then
    cd "$ROOT_DIR/apps/api"

    railway login 2>/dev/null || true
    railway link 2>/dev/null || railway init

    railway variables set \
        DATABASE_URL="postgresql+asyncpg://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
        DATABASE_URL_SYNC="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
        REDIS_URL="redis://localhost:6379/0" \
        LOG_LEVEL="INFO" \
        ENVIRONMENT="production"

    railway up --detach
    API_URL=$(railway domain 2>/dev/null || echo "https://api.your-app.railway.app")
    log "FastAPI deployed: $API_URL"
else
    warn "Railway CLI not found. Deploy manually at https://railway.app"
    warn "  → Create new project, point to apps/api/"
    warn "  → Set environment variables (see .env.example)"
    API_URL="https://api.your-app.railway.app"
fi

# ==========================================================================
# STEP 3: Railway — Martin Tile Server
# ==========================================================================
info ""
info "Step 3/4: Deploying Martin tile server to Railway..."

if command -v railway &> /dev/null; then
    cd "$ROOT_DIR/docker/martin"

    railway init --name "copper-atlas-martin" 2>/dev/null || true

    railway variables set \
        DATABASE_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
        MARTIN_DEFAULT_SRID="4326" \
        MARTIN_WORKERS="4"

    railway up --detach --service martin
    MARTIN_URL=$(railway domain 2>/dev/null || echo "https://martin.your-app.railway.app")
    log "Martin deployed: $MARTIN_URL"
else
    MARTIN_URL="https://martin.your-app.railway.app"
fi

# ==========================================================================
# STEP 4: Vercel — Update Environment Variables
# ==========================================================================
info ""
info "Step 4/4: Configuring Vercel frontend..."

cd "$ROOT_DIR/apps/web"

vercel env add NEXT_PUBLIC_API_URL production "$API_URL/api/v1" --yes 2>/dev/null || \
    warn "Could not set API URL env var"

vercel env add NEXT_PUBLIC_MARTIN_URL production "$MARTIN_URL" --yes 2>/dev/null || \
    warn "Could not set Martin URL env var"

# Redeploy with new env vars
vercel --prod --yes

# ==========================================================================
# DONE
# ==========================================================================
echo ""
echo "============================================================"
echo "  Deployment Complete! 部署完成！"
echo "============================================================"
echo ""
echo "  Frontend:   https://web-three-fawn-65.vercel.app"
echo "  API:        $API_URL"
echo "  API Docs:   $API_URL/docs"
echo "  Tiles:      $MARTIN_URL"
echo "  Database:   postgresql://db.$PROJECT_REF.supabase.co:5432/postgres"
echo ""
echo "  Verify:"
echo "    curl $API_URL/health"
echo "    curl $API_URL/api/v1/deposits?size=5"
echo "    open https://web-three-fawn-65.vercel.app/en/map"
echo ""
