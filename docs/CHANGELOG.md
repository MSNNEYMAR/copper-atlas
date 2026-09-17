# Copper Atlas — Changelog

## [0.2.0] — 2026-07-04 — Phase 2 Data-First Pivot

### Strategic Pivot
- **Data-first architecture**: 80% database, 20% website. The database is the product.
- Project redefined as a geological data platform, not a map website
- All future development centered on database quality, provenance, and extensibility

### Documentation System (12 documents)
- **VISION.md** — 5-year vision, target users, success metrics, technology philosophy
- **ROADMAP.md** — 5-phase plan (Foundation → Data → Intelligence → Platform → Authority)
- **DATA_STANDARD.md** — 72 canonical fields, all minerals, unit standardization, naming convention
- **DATABASE.md** — ER model redesign with Mermaid diagram, 15 new tables, JSONB strategy
- **DATA_PIPELINE.md** — 9-stage pipeline (Ingest→Clean→Normalize→Validate→Dedup→Enrich→Review→Load→Verify)
- **DATA_GOVERNANCE.md** — 4-tier source classification, confidence scoring, review workflow, data lifecycle
- **DATA_INTEGRATION.md** — End-to-end flow: CSV→PostGIS→API→MapLibre→Display, field mapping, CSV template
- **AI_ARCHITECTURE.md** — LLM pipeline for paper summarization, structured extraction, embedding similarity
- **KNOWLEDGE_GRAPH.md** — Property graph model, Cypher queries, embedding-based similarity edges
- **IMPORT_GUIDE.md** — Multi-format import guide, common errors, verification checklist
- **QUALITY_CONTROL.md** — 5-gate QC pipeline, weekly audit, SQL integrity checks

### Data Standards
- All 72 fields documented with DB types, requirements, examples
- Mineral Registry extended to 12 minerals (Cu, Au, Fe, Li, Zn, Pb, Ni, Ag, Mo, Co, REE, U)
- Unit standardization: metric only, decimal degrees, Ma for age, Mt for tonnage, % for grade
- JSONB strategy for mineral-specific extensions (copper, gold, iron, lithium fields defined)
- Field naming convention: snake_case, uniform across DB/API/TypeScript/CSV

### ER Model v2
- 15 new tables: regions, metallogenic_provinces, mining_districts, ore_bodies, mines, commodities, companies, papers, journals, authors, institutions, deposit_papers, paper_authors, deposit_images, ai_analyses
- Mermaid ER diagram documenting all relationships and cardinalities
- Migration plan: non-breaking additions first, breaking changes deferred to Phase 3

---

## [0.1.0] — 2026-07-04

### Architecture & Infrastructure
- Project initialized as pnpm monorepo with Turborepo (82→102 files)
- Docker Compose development environment (6 services)
- GitHub Actions CI pipeline (lint → typecheck → test → build)
- Deployment documentation (Vercel + Railway + Supabase + Upstash)
- Vercel config (headers, redirects, rewrites, ISR)
- Biome configured for code formatting and linting

### Database
- Hierarchical deposit classification (ltree-based, 8 classes + 15 subtypes)
- International Chronostratigraphic Chart (ICS 2024, 60+ time units)
- PROV-O provenance system (Entity/Activity/Agent tables)
- Extensible mineral type system (Mineral Registry pattern)
- Martin vector tile SQL functions (heatmap, cluster, individual points, countries)
- Deposit auto-provenance capture trigger

### Seed Data
- Complete copper deposit classification hierarchy (English + Chinese)
- Full geological time scale from Hadean to Quaternary
- 12 hydrothermal alteration types
- Mineral i18n (copper, gold, iron, lithium, zinc, molybdenum)
- 40+ countries with ISO codes
- 20+ world-class copper deposits with verified data
- Python seed script with data validation

### Backend (Updated 2026-07-04 — API Layer Complete)
- FastAPI application with lifespan management, middleware, structured logging
- Async SQLAlchemy + GeoAlchemy2 database layer with connection pooling
- **Deposit Repository**: Spatial bbox query (ST_Intersects), radius query (ST_DWithin), full-text search (tsvector), autocomplete (trigram), statistics aggregations
- **Deposit Service**: Business logic with GeoJSON formatting, bbox validation, coordinate transformation (pyproj)
- **API Endpoints** (all implemented):
  - `GET /api/v1/deposits` — List with bbox + filters (country, type, status, tonnage, grade, search)
  - `GET /api/v1/deposits/{id}` — Single deposit detail (GeoJSON Feature)
  - `GET /api/v1/deposits/slug/{slug}` — By URL-friendly slug
  - `GET /api/v1/deposits/{id}/nearby` — Nearby within radius (ST_DWithin)
  - `GET /api/v1/statistics/*` — 6 endpoints (summary, by-country, by-type, by-status, tonnage/grade distribution)
  - `GET /api/v1/search` — Full-text search + `/search/autocomplete`
  - `GET /api/v1/reference/*` — Minerals, countries, deposit-types, time-scale, statuses
  - `POST /api/v1/transform` — Coordinate transformation
- Pydantic schemas (GeoJSON Feature/FeatureCollection), dependency injection, OpenTelemetry
- Rate limiting (slowapi), custom exception hierarchy (404/400/500)
- Alembic migration (`0001_initial_schema.py` — full up/down for 16 tables)
- Pytest test suite (4 test files: deposits, statistics, spatial, reference)

### Frontend (Updated 2026-07-04 — Complete)

**Data Layer**:
- TanStack Query hooks: useDeposits (viewport-bounded), useDepositDetail (single), useNearbyDeposits, useSearchDeposits, useAutocomplete
- Statistics hooks: useStatsSummary, useStatsByCountry/Type/Status, useTonnage/GradeDistribution
- Reference data hooks: useCountries, useDepositTypes, useTimeScale, useStatuses, useMinerals (all cached 30min+)
- API client with timeout, error handling, and GeoJSON type safety
- Complete TypeScript type definitions (30+ interfaces)

**Search & Filters**:
- CountryFilter: multi-select combobox with search
- DepositTypeFilter: hierarchical tree (ltree-compatible) with expand/collapse
- StatusFilter: pill-style toggle (8 statuses, EN/ZH labels)
- TonnageRangeFilter: dual slider + number inputs (0-200 Mt)
- GradeRangeFilter: dual slider + number inputs (0-5%)
- GeologicalAgeFilter: preset period buttons + custom Ma range
- ActiveFilterChips: removable chips per filter + clear all
- URL parameter sync: shareable filtered views (/en/map?country=CL,PE&status=production)

**Deposit Detail Panel**:
- 8 sections: Overview, Specifications, Geology, Resources, Description, Nearby, Provenance
- Status badges, quality score visualization (5-dot), tonnage formatting
- Nearby deposits list (clickable to select on map)

**Statistics Dashboard**:
- 6 KPI cards (total deposits, total tonnage, avg grade, countries, producing mines, largest deposit)
- Bar chart (by country, by status, tonnage distribution)
- Donut chart (by deposit type, Recharts-based)
- Lazy-loaded charts for performance

**SEO & Accessibility**:
- Deposit detail pages (SSR with ISR hourly revalidation)
- JSON-LD structured data (Schema.org Place + Dataset)
- Dynamic sitemap.xml (static pages + top 100 deposits)
- robots.txt with GPTBot block
- OG meta tags, hreflang alternates, canonical URLs
- WCAG 2.1 AA foundation: ARIA labels, focus rings, skip-to-content, reduced motion

**CI/CD & Deployment**:
- GitHub Actions CI: frontend (lint→typecheck→test→build) + backend (lint→migrate→test) + migration smoke test
- Staging deployment workflow with health check smoke tests
- Vercel config (headers, ISR, rewrites, region)
- Railway + Supabase deployment documentation

**E2E Tests (Playwright)**:
- 5 test specs: home page, map interactions, filters, i18n, accessibility
- Chromium + Firefox projects
- 20+ test cases covering core user journeys

### Known Limitations
- USGS MRDS bulk data import not yet automated
- Martin tile server needs running PostGIS for visual verification
- Production deployment requires Supabase + Railway + Vercel accounts
