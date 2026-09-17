# Copper Atlas — Deployment Guide

> 全局铜矿床图谱 — 部署指南
> Last updated: 2026-07-04

## Architecture (Production)

```
┌─────────────────────────────────────────────────────────┐
│                       INTERNET                          │
└────────────┬──────────────────────────────┬─────────────┘
             │                              │
      ┌──────▼──────┐                ┌──────▼──────┐
      │   Vercel     │                │   Railway   │
      │ (Next.js)    │                │  (FastAPI)  │
      │ copper-atlas │◄───────────────│  api server │
      │ .vercel.app  │   API calls    │  :8000      │
      └──────┬───────┘                └──────┬───────┘
             │ tile requests                 │
      ┌──────▼───────┐                ┌──────▼───────┐
      │   Railway    │                │   Supabase   │
      │   Martin     │◄───────────────│ PostgreSQL   │
      │   :3000      │   SQL queries  │ + PostGIS    │
      └──────────────┘                └──────────────┘
```

## Services

| Service | Platform | URL Pattern |
|---------|----------|-------------|
| Next.js Frontend | Vercel | `copper-atlas.vercel.app` |
| FastAPI Backend | Railway | `api.copper-atlas.railway.app` |
| Martin Tile Server | Railway | `martin.copper-atlas.railway.app` |
| PostgreSQL + PostGIS | Supabase | `db.xxx.supabase.co` |
| Redis Cache | Upstash | `xxx.upstash.io` |

## Step-by-Step Deployment

### 1. Supabase (Database)

```bash
# Create project at supabase.com → SQL Editor:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

# Run migrations
cd apps/api
DATABASE_URL_SYNC="postgresql://..." alembic upgrade head

# Seed data
cd data/import_scripts
DATABASE_URL_SYNC="postgresql://..." python seed_all.py
```

### 2. Railway (Backend + Martin)

```bash
# Deploy FastAPI
railway up --service api
# Set env: DATABASE_URL, REDIS_URL, MARTIN_URL

# Deploy Martin
railway up --service martin
# Set env: DATABASE_URL
```

### 3. Vercel (Frontend)

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
cd apps/web
vercel --prod

# Set env variables:
# NEXT_PUBLIC_API_URL=https://api.xxx.railway.app/api/v1
# NEXT_PUBLIC_MARTIN_URL=https://martin.xxx.railway.app
# NEXT_PUBLIC_SITE_URL=https://copper-atlas.vercel.app
```

### 4. Verify

```bash
# Health check
curl https://api.xxx.railway.app/health

# API check
curl https://api.xxx.railway.app/api/v1/deposits?size=1

# Frontend
open https://copper-atlas.vercel.app/en/map
```

## CI/CD

GitHub Actions workflows (`.github/workflows/`):

- **ci.yml** — Lint, typecheck, test, build (runs on PR + push to main)
- **deploy-staging.yml** — Auto-deploy develop branch to staging
- Vercel Git integration auto-deploys main branch to production

## Environment Variables Reference

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | API | `postgresql+asyncpg://...` |
| `DATABASE_URL_SYNC` | API, Martin | `postgresql://...` |
| `REDIS_URL` | API | `redis://...` |
| `MARTIN_URL` | API, Web | Tile server base URL |
| `NEXT_PUBLIC_API_URL` | Web | API base URL |
| `NEXT_PUBLIC_MARTIN_URL` | Web | Martin tile URL |
| `NEXT_PUBLIC_SITE_URL` | Web | Canonical site URL |
| `LOG_LEVEL` | API | `DEBUG`, `INFO`, `WARNING` |
| `ENVIRONMENT` | API | `development`, `staging`, `production` |

## Data Refresh Pipeline

```bash
# Monthly: download latest USGS MRDS data
python data/import_scripts/import_usgs.py

# Validate
python data/import_scripts/validate_data.py

# Create new dataset release
python data/import_scripts/create_release.py --version v1.1.0

# Push to Zenodo for DOI minting
python data/import_scripts/publish_zenodo.py --version v1.1.0
```
