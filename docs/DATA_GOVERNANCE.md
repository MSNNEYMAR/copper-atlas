# Copper Atlas — Data Governance

> 全球铜矿床图谱 — 数据治理框架
> Version 2.0 · 2026-07-04 · Phase 2 Data-First

---

## Part I — Data Source Tiers

Every data source is classified into one of four tiers. The tier determines
trust level, auto-approval threshold, and citation priority.

### Tier 1 — Authoritative (auto-approved)
Government geological surveys, international standards bodies.

| Source | Example | Quality Score |
|--------|---------|---------------|
| NI 43-101 Technical Report | SEDAR filings | 5 |
| JORC 2012 Report | ASX filings | 5 |
| USGS Mineral Resources Program | MRDS database | 4-5 |
| National geological survey | SERNAGEOMIN (Chile), GA (Australia) | 4-5 |
| CRIRSCO-compliant report | SAMREC (South Africa) | 5 |
| ICS stratigraphic data | International Commission on Stratigraphy | 5 |

**Policy**: Tier 1 data enters with `verification_status = "verified"`,
bypasses manual review queue.

### Tier 2 — Reliable (auto-approved with flag)
Peer-reviewed journals, major mining companies, established databases.

| Source | Example | Quality Score |
|--------|---------|---------------|
| Economic Geology (journal) | Peer-reviewed paper with full data | 4 |
| Mineralium Deposita | Peer-reviewed | 4 |
| Ore Geology Reviews | Peer-reviewed | 4 |
| Major mining company annual report | BHP, Rio Tinto, Freeport | 3-4 |
| Mindat (verified entries) | Moderated, cited sources | 3-4 |
| OneGeology | Multi-agency collaboration | 4 |

**Policy**: Tier 2 data enters with `verification_status = "verified"`,
but records with quality < 4 are flagged for human review within 30 days.

### Tier 3 — Secondary (requires review)
News articles, conference abstracts, unverified databases.

| Source | Example | Quality Score |
|--------|---------|---------------|
| Mining.com / news article | No primary data citation | 2 |
| Conference abstract | Preliminary data | 2 |
| Wikipedia | Varies | 1-2 |
| Historical estimate (pre-JORC) | No modern verification | 2 |

**Policy**: Tier 3 data enters with `verification_status = "pending"`,
must be manually reviewed before promotion to "verified".

### Tier 4 — Unknown (quarantined)
Unsourced, unverifiable, or AI-generated data.

| Source | Example | Quality Score |
|--------|---------|---------------|
| AI-generated deposit record | Not human-reviewed | 1 |
| Anonymous contribution | No provenance | 1 |
| Unattributed forum post | Cannot verify | 1 |

**Policy**: Tier 4 data is stored but marked `verification_status = "quarantined"`,
`is_public = false`. Not visible on public map. Must be sourced or deleted within 90 days.

---

## Part II — Confidence Scoring

### Algorithm

```
Confidence = (
    source_tier_score * 0.40 +
    coordinate_precision_score * 0.20 +
    data_completeness_score * 0.20 +
    recency_score * 0.10 +
    human_review_score * 0.10
)

source_tier_score:       Tier1=5, Tier2=4, Tier3=2, Tier4=1
coordinate_precision:    <10m=5, <100m=4, <1km=3, <10km=2, unknown=1
data_completeness:       >80% fields=5, >60%=4, >40%=3, >20%=2, <20%=1
recency:                 <2yr=5, <5yr=4, <10yr=3, <20yr=2, >20yr=1
human_review:            reviewed+approved=5, reviewed=3, not_reviewed=1
```

### Display
Confidence is displayed as a 5-star rating (`data_quality_score`).
Confidence score (0.0-1.0) is stored internally for sorting/ranking,
not displayed to end users.

---

## Part III — Review Workflow

```
                      ┌─────────────┐
                      │  New Record │
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  Auto-score │
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         score ≥ 4      score 2-3      score = 1
              │              │              │
      ┌───────▼──────┐ ┌───▼────────┐ ┌───▼────────┐
      │  Auto-verify │ │  Review    │ │ Quarantine │
      │  is_public=T │ │  Queue     │ │ is_public=F│
      └──────────────┘ └───┬────────┘ └────────────┘
                           │
                    ┌──────▼──────┐
                    │   Reviewer  │
                    │   approves? │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
          Approve       Reject      Request
              │            │         Changes
      ┌───────▼──────┐ ┌─▼────┐  ┌───▼──────┐
      │  Publish     │ │Archive│  │ Back to  │
      │  is_public=T │ │       │  │ submitter│
      └──────────────┘ └──────┘  └──────────┘
```

### Reviewer Responsibilities
- Verify source exists and says what we claim
- Check coordinate against satellite imagery
- Confirm deposit type classification
- Validate tonnage/grade against source
- Assign final quality score

---

## Part IV — Version Control

### Dataset Versioning

```
v1.0.0  — Initial release (24 deposits)
v1.1.0  — Added 100 deposits (Phase 2 seed)
v1.2.0  — Added USGS MRDS subset (500 deposits)
v2.0.0  — Schema change (new tables: regions, companies, papers)
v2.1.0  — Added gold deposits
```

### Semantic Versioning for Data

```
MAJOR.MINOR.PATCH

MAJOR — Schema change (tables added/removed, columns renamed)
MINOR — New data added (records, fields), no schema change
PATCH — Data corrections (fixes to existing records)
```

### Snapshot vs. Live

- **Live database**: Always the latest verified data. Updated continuously.
- **Snapshot releases**: Versioned exports (CSV, GeoJSON, GeoPackage) published to Zenodo with DOI.
  Released quarterly for minor versions, immediately for major versions.

---

## Part V — Data Lifecycle

```
                                              ┌──────────┐
                     ┌────────────────────────│ Archive  │
                     │                        │ (Zenodo) │
                     │                        └──────────┘
                     │                             ▲
┌─────┐    ┌─────────▼────┐   ┌───────────┐   ┌────┴─────┐
│ Raw │───▶│  Processed   │──▶│  Verified  │──▶│Production│
└─────┘    └──────────────┘   └───────────┘   └──────────┘
  │              │                  │               │
  │              │                  │               │
  └── Stored ───┴── in raw/ ───────┴── queue/ ─────┴── public API
     as-is        normalized         pending          live data
```

### Stage Definitions

| Stage | Location | Access | Description |
|-------|----------|--------|-------------|
| **Raw** | `data/raw/` | Internal | Original file, unmodified, timestamped |
| **Processed** | `data/processed/` | Internal | Cleaned, normalized, not yet validated |
| **Verified** | PostgreSQL `verification_status='verified'` | Internal | Passed all checks, pending final review |
| **Production** | PostgreSQL `is_public=true` | Public | Visible on map, in API, in downloads |
| **Archive** | Zenodo DOI | Public | Versioned snapshot, immutable |

### Retention Policy
- Raw data: kept indefinitely (provenance)
- Processed: 1 year after production promotion
- Verified queue: 90 days max pending review
- Production: kept indefinitely
- Archive: kept permanently (Zenodo)

---

## Part VI — Update Strategy

### Full Refresh (Monthly)
- Download latest USGS MRDS
- Re-import and diff against existing
- Flag new, changed, and removed records
- Human review changes > 10% tonnage difference

### Incremental Update (On-demand)
- New paper published → manual entry
- New NI 43-101 report → manual entry
- User contribution → review queue

### Change Detection
```sql
-- Detect records where tonnage changed by >10%
SELECT old.slug, old.tonnage_mt, new.tonnage_mt,
       ABS(new.tonnage_mt - old.tonnage_mt) / old.tonnage_mt * 100 as pct_change
FROM import_staging new
JOIN deposits old ON new.slug = old.slug
WHERE ABS(new.tonnage_mt - old.tonnage_mt) / old.tonnage_mt > 0.10;
```

---

## Part VII — Media & Copyright

### Image Policy
1. All images must have: **credit**, **license**, **source URL**
2. Preferred: CC-BY, CC-BY-SA, public domain
3. All Rights Reserved images: stored as URL reference only, not re-hosted
4. AI-generated images: prohibited unless explicitly labeled and documented

### Citation Policy
1. Every deposit must cite its primary data source
2. DOIs are preferred over URLs (permanent)
3. Citation format: Author (Year). Title. Journal/Publisher. DOI.
4. Data paper publication requires full citation of all sources used

### AI Content Policy
1. AI-generated text must be labeled: `ai_generated = true`
2. AI-generated summaries must be human-reviewed before publication
3. AI-generated deposit records are never published without human verification
4. AI-generated images are never used

---

## Part VIII — Duplicate Detection

### Strategy (3-pass)

```
PASS 1 — Exact match
  slug collision → REJECT (database unique constraint)

PASS 2 — Fuzzy name match
  Levenshtein(name_a, name_b) ≤ 2  AND  same country
  → FLAG as possible duplicate, human decides

PASS 3 — Spatial proximity
  ST_Distance(location_a, location_b) < 500m
  AND similar name (trigram similarity > 0.3)
  → HIGH PROBABILITY duplicate, auto-merge or flag
```

### Merge Policy
When duplicates are confirmed:
1. Keep the record with higher `data_quality_score`
2. Merge `alternative_names` arrays
3. Merge `reference_dois` arrays
4. Merge `tags` arrays
5. Keep the more precise `location`
6. Record merge in `provenance_activity` table

---

## Part IX — Roles & Permissions

Phase 3 implementation. Defined now for schema planning.

| Role | Permissions |
|------|-------------|
| **Anonymous** | Read public data via API |
| **Registered User** | Submit new deposits, suggest corrections |
| **Contributor** | Edit own submissions, bulk import |
| **Reviewer** | Approve/reject submissions, edit any record |
| **Editor** | Manage classifications, featured deposits |
| **Admin** | Full access, schema changes, user management |
