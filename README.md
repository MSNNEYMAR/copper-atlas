# Global Copper Deposits Atlas · 全球铜矿床图谱

[![CI](https://github.com/MSNNEYMAR/copper-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/MSNNEYMAR/copper-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Data License](https://img.shields.io/badge/data-CC%20BY%204.0-green.svg)](https://creativecommons.org/licenses/by/4.0/)

🌍 A professional geological platform for exploring global copper deposits with interactive WebGL maps, comprehensive deposit data, and rich statistics — built with enterprise-grade engineering practices.

> **Live**: [https://web-three-fawn-65.vercel.app/en](https://web-three-fawn-65.vercel.app/en)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Copper Atlas Platform                  │
├───────────┬──────────────────┬──────────────────────────┤
│  Vercel   │    Railway        │     Supabase             │
│ (Next.js) │  ┌─────────────┐  │  (PostgreSQL + PostGIS) │
│           │  │  FastAPI     │  │                         │
│           │  │  (Python)    │──│  · 16 tables            │
│           │  └──────┬───────┘  │  · GiST spatial indexes │
│           │         │          │  · ltree hierarchy      │
│           │  ┌──────▼───────┐  │  · PROV-O provenance    │
│           │  │  Martin      │──│  · Vector tile functions│
│           │  │  (Rust MVT)  │  │                         │
│           │  └──────────────┘  └─────────────────────────┘
└───────────┴──────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|--------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS | SSR + CSR hybrid, i18n (EN/ZH) |
| Map | MapLibre GL JS 4.5 | GPU-accelerated WebGL rendering |
| State | Zustand 5.0, TanStack Query 5 | Filter state, API caching |
| Backend | FastAPI (Python 3.12) | Spatial REST API, GeoJSON |
| ORM | SQLAlchemy 2.0 + GeoAlchemy2 | Async PostGIS queries |
| Database | PostgreSQL 16 + PostGIS 3.4 | Spatial data, MVT tiles |
| Tiles | Martin 0.15 (Rust) | Vector tile generation |
| Cache | Redis 7.4 | Tile cache, stats caching |
| E2E | Playwright | Cross-browser testing |
| CI/CD | GitHub Actions | Lint → Test → Build → Deploy |

## Quick Start

### Prerequisites
- Node.js 22+, pnpm 9+
- Python 3.12+
- Docker Desktop

### Local Development (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/MSNNEYMAR/copper-atlas.git
cd copper-atlas
pnpm install
cd apps/api && pip install -e ".[dev]" && cd ../..

# 2. Start database + services
docker compose -f docker/docker-compose.yml up -d

# 3. Run migrations + seed data
docker compose -f docker/docker-compose.yml exec api alembic upgrade head
python data/import_scripts/seed_all.py

# 4. Start dev servers
pnpm dev    # Starts Next.js (port 3001) + FastAPI (port 8000)

# 5. Open http://localhost:3001/en/map
```

### Full Production Deployment

```bash
# See detailed guide
bash scripts/deploy-full.sh
# Or read: docs/deployment.md
```

## Project Structure

```
copper-atlas/
├── apps/
│   ├── web/              # Next.js frontend (54 files)
│   │   ├── src/
│   │   │   ├── components/map/     # MapLibre GL JS components
│   │   │   ├── components/search/  # Search & filter panel
│   │   │   ├── components/deposit/ # Detail panel
│   │   │   ├── components/statistics/ # Charts & KPIs
│   │   │   ├── hooks/             # TanStack Query hooks
│   │   │   ├── stores/            # Zustand stores
│   │   │   └── types/             # TypeScript definitions
│   │   └── messages/              # i18n (EN + ZH)
│   └── api/              # FastAPI backend (35 files)
│       ├── src/
│       │   ├── api/v1/            # REST endpoints
│       │   ├── models/            # SQLAlchemy models
│       │   ├── repositories/      # Spatial query layer
│       │   ├── services/          # Business logic
│       │   └── schemas/           # Pydantic schemas
│       ├── alembic/               # Database migrations
│       └── tests/                 # Pytest suite
├── docker/               # Docker Compose + Martin + Caddy
│   └── postgres/init/    # SQL DDL (6 files, 16 tables)
├── data/
│   ├── seeds/            # Reference data (4 SQL files)
│   └── import_scripts/   # Python data import pipeline
├── packages/
│   └── api-client/       # Auto-generated API client
├── docs/                 # Architecture, TODO, Changelog, Deployment
└── .github/workflows/    # CI/CD pipelines
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/deposits` | List with spatial + attribute filters |
| `GET` | `/api/v1/deposits/{id}` | Single deposit detail (GeoJSON Feature) |
| `GET` | `/api/v1/deposits/slug/{slug}` | Deposit by URL-friendly slug |
| `GET` | `/api/v1/deposits/{id}/nearby` | Nearby deposits (ST_DWithin) |
| `GET` | `/api/v1/statistics/summary` | KPI overview |
| `GET` | `/api/v1/statistics/by-country` | By country aggregation |
| `GET` | `/api/v1/statistics/by-type` | By deposit type |
| `GET` | `/api/v1/search` | Full-text search |
| `GET` | `/api/v1/search/autocomplete` | Prefix autocomplete |
| `GET` | `/api/v1/reference/*` | Countries, types, time scale, statuses |
| `POST` | `/api/v1/transform` | Coordinate transformation |
| `GET` | `/health` | Health check |

📖 **Full API docs**: `/docs` (Swagger UI) | `/redoc` (ReDoc)

## Database Schema Highlights

- **16 tables** with full PostGIS spatial support
- **ltree** hierarchical deposit classification (8 top-level + 15 subtypes)
- **ICS 2024** International Chronostratigraphic Chart (60+ time units)
- **PROV-O** data provenance system (Entity/Activity/Agent)
- **Dataset versioning** with DOI support
- Mineral-agnostic design — adding gold/iron/lithium requires NO schema changes

## Key Features (Phase 1 MVP)

✅ Interactive WebGL map (MapLibre GL JS)
✅ Multi-level rendering: heatmap → clusters → individual points → labels
✅ Basemap switcher (OSM, satellite, terrain, dark)
✅ Search: country, deposit type, status, tonnage/grade range, geological age
✅ Deposit detail panel (8 sections, 30+ data fields)
✅ Statistics dashboard (6 KPIs, bar/donut charts)
✅ i18n: English + Simplified Chinese (200+ translation keys)
✅ SEO: SSR deposit pages, JSON-LD, hreflang, sitemap, robots.txt
✅ WCAG 2.1 AA: ARIA labels, keyboard navigation, focus rings, reduced motion
✅ Full-text search + autocomplete
✅ Coordinate transformation (any EPSG → any EPSG)
✅ Structured logging (structlog + OpenTelemetry)
✅ Rate limiting, CORS, security headers
✅ Docker Compose (6 services), CI/CD (GitHub Actions), E2E (Playwright)

## Future Minerals

| Phase | Minerals | Status |
|-------|----------|--------|
| Phase 1 | Copper (Cu) | ✅ Live |
| Phase 2 | Gold (Au), Iron (Fe), Lithium (Li) | Planned |
| Phase 3 | Zinc (Zn), Lead (Pb), Nickel (Ni) | Planned |

Adding a new mineral: update `MINERAL_REGISTRY` → seed data → enable flag. ~2-4 dev days + data import.

## License

- **Code**: [MIT](LICENSE)
- **Data**: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Dataset DOI**: Reserved via Zenodo (v1.0)

---

*Built with ❤️ by the Copper Atlas team · 全球铜矿床图谱*
