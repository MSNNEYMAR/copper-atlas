# Copper Atlas — Vision

> 全球铜矿床图谱 — 项目愿景
> Version 2.0 · 2026-07-04 · Phase 2 Data-First Pivot

---

## What We Are Building

**Copper Atlas is not a map website. It is a geological data platform.**

A curated, versioned, peer-reviewable, AI-augmented global mineral deposits database
that happens to have a web map as its primary interface.

## The Core Asset

The **database** is the product. The website is a view into it.

In 5 years, the Copper Atlas database should be:
- Cited in academic papers alongside USGS MRDS and Mindat
- The default starting point for any global copper research project
- A model for how geological data should be curated, versioned, and published
- Extended to gold, iron, lithium, rare earths, nickel, and uranium

## Guiding Principles

### 1. Data First (数据优先)
80% of effort goes to data quality, provenance, and completeness.
20% goes to the presentation layer.
If the data is wrong, the map is worthless. If the data is right, the map is a tool.

### 2. Real Data Only (真实数据)
No simulated data. No random data. No AI-generated deposit records.
Every row in the database must trace back to a public, verifiable source.
If we don't know, we leave it NULL. We never guess.

### 3. FAIR Principles
- **Findable**: Every deposit has a DOI-citable reference. Every dataset version has a DOI.
- **Accessible**: Public API, public download, CC-BY 4.0 license.
- **Interoperable**: OGC standards. W3C PROV-O. GeoJSON. Linked to Mindat, Wikidata, USGS.
- **Reusable**: CSV export, GeoPackage, GeoJSON. Well-documented schema.

### 4. Mineral-Agnostic From Day 1
The database schema must support copper, gold, iron, lithium, rare earths,
nickel, molybdenum, uranium, and any future commodity — without migration.
Mineral type is a filter, not a table.

### 5. Research-Grade Provenance
Every data point records: who, when, how, from what source, with what confidence.
This is not a hobby project. It is a research infrastructure.

### 6. Long-Term Thinking
Design decisions prioritize 5-10 year maintainability over short-term speed.
The database schema should survive a decade. The API should be stable.
Breaking changes require a major version and a migration plan.

## What We Are NOT Building

- ❌ A mining company CRM
- ❌ A real-time commodity price tracker
- ❌ A social network for geologists
- ❌ A flashy 3D globe with animations
- ❌ A startup that needs users to survive

## Target Users (in priority order)

1. **Academic researchers** — who need data they can cite in papers
2. **Government geological surveys** — who need a model for open data
3. **Mining industry professionals** — who need quick, reliable reference data
4. **Students and educators** — who need accessible geological data for learning
5. **General public** — who are curious about where copper comes from

## Success Metrics (5-Year)

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Deposits in database | 500 | 5,000 | 25,000 |
| Minerals supported | 1 (Cu) | 6 | 12 |
| Academic citations | 0 | 5 | 50 |
| Dataset DOI versions | 2 | 12 | 60 |
| Data contributors | 1 | 10 | 100 |
| Schema breaking changes | 0 | 0 | 0 |
| Countries covered | 25 | 80 | 150 |

## Technology Philosophy

- **Database**: PostgreSQL + PostGIS. Proven, powerful, portable. No NoSQL.
- **API**: REST + OGC. Standards-based. Self-documenting. Versioned.
- **Frontend**: Any framework. The API is the contract. The map is replaceable.
- **AI**: Augmentation, not generation. AI writes summaries from peer-reviewed papers, not invents deposits.
- **Storage**: Git for code. PostgreSQL for data. Zenodo for releases. No proprietary formats.

## Relationship to Other Databases

```
Copper Atlas ← USGS MRDS (bulk import, primary source)
Copper Atlas ← Mindat (cross-reference IDs)
Copper Atlas ← Wikidata (linked open data)
Copper Atlas ← Company reports (NI 43-101, JORC — detailed resource data)
Copper Atlas → Zenodo (versioned dataset releases with DOI)
Copper Atlas → OneGeology (OGC WMS/WFS services)
Copper Atlas → Wikidata (contribute back structured data)
```

We do not compete with USGS or Mindat. We complement them by providing
curated, versioned, cross-referenced, AI-augmented data that is easy to
consume via API and easy to cite in academic work.

## The Name

"Copper Atlas" starts with copper. When the schema proves itself,
we will rename or launch sibling projects:
- Gold Atlas (金矿图谱)
- Iron Atlas (铁矿图谱)
- Lithium Atlas (锂矿图谱)
- Global Mineral Deposits Atlas (全球矿产图谱) — the umbrella

But for now: do one thing, do it well. Start with copper.
