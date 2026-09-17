# Copper Atlas — Roadmap

> 全球铜矿床图谱 — 五年路线图
> Version 2.0 · 2026-07-04

---

## Phase 1 — Foundation (已完成 ✅)

**Goal**: Prove the concept. Ship a working map with real data.

| Deliverable | Status |
|-------------|--------|
| PostgreSQL + PostGIS database (16 tables) | ✅ |
| Deposit classification hierarchy (ltree) | ✅ |
| Geological time scale (ICS 2024) | ✅ |
| PROV-O provenance system | ✅ |
| 24 world-class copper deposits | ✅ |
| Next.js map with GeoJSON rendering | ✅ |
| Search, filter, detail panel | ✅ |
| EN/ZH i18n | ✅ |
| CI/CD + Vercel deployment | ✅ |
| Architecture review (4 experts) | ✅ |
| Data Integration Specification v1.0 | ✅ |

---

## Phase 2 — Data First (当前 · 2026 Q3-Q4) 🔴

**Goal**: Build the database as the core asset.
Website development drops to 20%. Data work takes 80%.

### 2.1 Seed Database v0.1 (Weeks 1-2)
- [ ] 100 representative copper deposits from real sources
- [ ] Cover 12+ countries, all major deposit types
- [ ] Every record has source, reference, confidence score
- [ ] Output: seed.csv, seed.geojson, import.sql, sources.md
- [ ] Cross-reference with USGS MRDS, Mindat IDs

### 2.2 Data Standards (Weeks 1-2)
- [ ] Complete field specification for all future minerals
- [ ] CSv/GeoJSON/API field naming standard
- [ ] Unit standardization (metric, SI)
- [ ] Coordinate reference system policy
- [ ] Classification code registry

### 2.3 Data Pipeline Design (Weeks 2-3)
- [ ] Multi-format importer (CSV, Excel, GeoJSON, SHP, GPKG)
- [ ] Validation pipeline (10 checks)
- [ ] Deduplication logic
- [ ] AI-assisted data extraction from papers
- [ ] Manual review workflow

### 2.4 ER Model Redesign (Weeks 2-3)
- [ ] Full entity-relationship diagram
- [ ] New tables: region, metallogenic_province, mining_district, ore_body, mine, company, paper, author, journal, image, ai_analysis
- [ ] Migration plan (no data loss)
- [ ] JSONB strategy for extensible fields

### 2.5 Data Governance (Weeks 3-4)
- [ ] Data source tier system (Tier 1-4)
- [ ] Confidence scoring algorithm
- [ ] Review/approval workflow
- [ ] Version control policy
- [ ] Data lifecycle (raw → processed → verified → production → archive)
- [ ] AI-generated content labeling policy

### 2.6 Documentation System (Ongoing)
- [ ] VISION.md ✅
- [ ] ROADMAP.md ✅
- [ ] DATABASE.md
- [ ] DATA_STANDARD.md
- [ ] DATA_PIPELINE.md
- [ ] DATA_GOVERNANCE.md
- [ ] AI_ARCHITECTURE.md
- [ ] KNOWLEDGE_GRAPH.md
- [ ] IMPORT_GUIDE.md
- [ ] QUALITY_CONTROL.md
- [ ] CHANGELOG.md (updated)

### 2.7 Data Collection (Ongoing)
- [ ] USGS MRDS bulk import (copper subset, ~5,000 records)
- [ ] USGS Global Copper Assessment data
- [ ] Major company NI 43-101/JORC reports
- [ ] Key academic papers (top 50 copper papers)
- [ ] National survey data (Chile, Peru, Australia, Canada, China)

---

## Phase 3 — Scale & Intelligence (2027) 🟡

### 3.1 Multi-Mineral Expansion
- [ ] Gold deposits database (500+ records)
- [ ] Iron deposits database (300+ records)
- [ ] Lithium deposits database (200+ records)
- [ ] Rare earth, nickel, molybdenum schema validation
- [ ] Cross-mineral association analysis

### 3.2 AI Integration
- [ ] LLM-based paper summarization pipeline
- [ ] AI-generated deposit descriptions (human-reviewed)
- [ ] Embedding-based similar deposit search
- [ ] Mineral prospectivity prediction (research collaboration)
- [ ] Automated data extraction from PDF reports

### 3.3 Knowledge Graph
- [ ] Neo4j or PostgreSQL graph extension
- [ ] Deposit → Country → Region → Province graph
- [ ] Deposit → Classification → Parent type hierarchy
- [ ] Deposit → Company → Parent company graph
- [ ] Paper → Author → Institution → Country graph
- [ ] Deposit → Similar Deposit (embedding-based edges)

### 3.4 Advanced Features
- [ ] User accounts + contributor workflow
- [ ] OGC WMS/WFS services
- [ ] 3D subsurface visualization
- [ ] Drilling data integration
- [ ] Mobile-responsive data collection app
- [ ] Public API with API keys and rate limiting

---

## Phase 4 — Platform (2028) 🟢

### 4.1 Community & Contribution
- [ ] Public contribution workflow (submit → review → publish)
- [ ] Expert reviewer network
- [ ] Automated data quality scoring
- [ ] Contributor attribution and credit system

### 4.2 Research Platform
- [ ] Integrated Jupyter notebook environment
- [ ] Spatial analysis tools (buffer, intersection, proximity)
- [ ] Statistical analysis dashboard
- [ ] Custom report generation

### 4.3 Data Products
- [ ] Monthly dataset releases on Zenodo
- [ ] PDF data reports (auto-generated)
- [ ] GIS-ready downloads (GeoPackage, Shapefile)
- [ ] API SDKs (Python, R, JavaScript)

---

## Phase 5 — Authority (2029-2030) 🔵

### 5.1 Scientific Recognition
- [ ] Data paper published in Nature Scientific Data
- [ ] DOI for every dataset version
- [ ] Integration with global research data infrastructure
- [ ] Cited in peer-reviewed geological research

### 5.2 Global Coverage
- [ ] 25,000+ deposits across 12+ minerals
- [ ] 150+ countries covered
- [ ] Complete major deposit type coverage
- [ ] Integration with national geological surveys

### 5.3 Sustainability
- [ ] Open-source community governance model
- [ ] Sustainable funding (grant, institutional, sponsorship)
- [ ] Automated data refresh pipeline
- [ ] Long-term archival (Zenodo, institutional repository)

---

## Never On The Roadmap

- ❌ Paid/premium data tiers (all data is open)
- ❌ Advertising
- ❌ Cryptocurrency / blockchain integration
- ❌ AI-generated deposit records (AI assists, humans verify)
- ❌ Proprietary data formats
- ❌ Vendor lock-in to any cloud platform
