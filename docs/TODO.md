# Copper Atlas — Development TODO

> 全局铜矿床图谱 — 开发待办事项
> Last updated: 2026-07-04
> **Phase 1 MVP: 100% COMPLETE** 🎉

## ✅ Phase 1 — Complete

### Infrastructure & Data Model ✅
- Monorepo (pnpm + Turborepo), Biome linting, Docker Compose (6 services)
- 16 PostgreSQL tables with PostGIS, GiST indexes, ltree hierarchy
- PROV-O provenance system, dataset versioning, external ID mapping
- Martin vector tile server configuration

### API Layer ✅
- Next.js API routes (Edge runtime) → Supabase PostgREST proxy
- Vercel serverless functions: deposits, statistics, health
- GeoJSON FeatureCollection responses, bbox filtering, pagination

### Database ✅
- **Supabase project**: `aamagslubcfodgeiiqor` (PostgreSQL 17 + PostGIS 3.3)
- **24 world-class copper deposits** seeded across 11 countries
- **23 deposit classification entries** (8 top-level + 15 subtypes)
- **ICS 2024 geological time scale** (60+ units)
- **12 alteration types**, mineral i18n, deposit type i18n
- RLS policies enabled for public read access

### Frontend ✅
- Next.js 14 App Router, i18n (EN/ZH), Tailwind CSS
- Interactive MapLibre GL JS map (heatmap → cluster → points)
- Search/filter panel (country, type, status, tonnage, grade, age)
- Deposit detail panel (8 sections), statistics dashboard (6 charts)
- Basemap switcher, legend, map controls
- URL parameter sync (shareable filtered views)

### SEO & Accessibility ✅
- SSR deposit detail pages with ISR, JSON-LD, OG meta
- Dynamic sitemap.xml, robots.txt, hreflang alternates
- WCAG 2.1 AA: ARIA labels, keyboard nav, focus rings, reduced motion

### CI/CD ✅
- GitHub Actions: lint → typecheck → test → build → deploy
- **Vercel production**: `https://web-a94sw6igo-msnneymars-projects.vercel.app`

## 🔗 Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://web-a94sw6igo-msnneymars-projects.vercel.app |
| **API** | https://web-a94sw6igo-msnneymars-projects.vercel.app/api/v1 |
| **Supabase** | https://aamagslubcfodgeiiqor.supabase.co |

## 🟡 Phase 2 — Planned

- [ ] Gold, iron, lithium mineral types
- [ ] Martin tile server deployment (Railway or direct Supabase MVT)
- [ ] Geological overlay layers (WMS)
- [ ] Admin panel for data management
- [ ] User authentication
- [ ] USGS MRDS bulk data import pipeline
- [ ] Contract tests (Pact)
- [ ] Feature flag system

## 🟢 Phase 3+ — Future

- [ ] Drilling data model
- [ ] 3D terrain view
- [ ] Advanced spatial analysis
- [ ] Mobile app
- [ ] AI/ML mineral prospectivity

## Technical Debt

| Item | Reason | Target |
|---|---|---|
| Auth system | MVP is public data | Phase 3 |
| Raster data (COG/STAC) | Complex setup | Phase 2 |
| Contract tests | OpenAPI spec first | Phase 2 |
| Martin tile server | Vercel API routes handle queries | Phase 2 |
| GraphQL | REST covers MVP | Phase 3 |
