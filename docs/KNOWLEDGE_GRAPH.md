# Copper Atlas — Knowledge Graph

> 全球铜矿床图谱 — 知识图谱设计
> Version 1.0 · 2026-07-04 · Phase 3

---

## Why a Knowledge Graph

A relational database answers "what" and "where".
A knowledge graph answers "how", "why", and "what is related to what".

Example queries only a graph can answer efficiently:

1. "Show all porphyry copper deposits in continental arcs that formed in the Eocene"
2. "Which deposits share similar alteration assemblages?"
3. "Find deposits studied by the same research group"
4. "What is the shortest path from deposit A to deposit B through shared geological features?"
5. "Cluster all copper deposits by tectonic setting, host rock, and mineralization age"

---

## Graph Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COPPER ATLAS KNOWLEDGE GRAPH                      │
│                                                                      │
│                         ┌─────────┐                                  │
│                         │Company  │                                  │
│                         └────┬────┘                                  │
│                              │ OPERATES                              │
│                              ▼                                       │
│  ┌──────────┐ HOSTED_IN ┌─────────┐ CONTAINS ┌──────────┐          │
│  │Host Rock │◄──────────│ Deposit │─────────▶│Ore Body  │          │
│  └──────────┘           └────┬────┘          └──────────┘          │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│    ┌────▼────┐         ┌─────▼──────┐      ┌─────▼──────┐          │
│    │Alteration│        │Classification│      │Commodity  │          │
│    └─────────┘         └─────────────┘      └────────────┘          │
│                                                                      │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│    ┌────▼────┐         ┌─────▼──────┐      ┌─────▼──────┐          │
│    │ Country │         │Metallogenic│       │Geological  │          │
│    └─────────┘         │ Province  │       │Time Scale  │          │
│                         └───────────┘       └────────────┘          │
│                                                                      │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│    ┌────▼────┐         ┌─────▼──────┐      ┌─────▼──────┐          │
│    │  Paper  │─────────│   Author   │──────│Institution │          │
│    └─────────┘ CITES   └────────────┘      └────────────┘          │
│         │                                                            │
│    ┌────▼────┐                                                       │
│    │ Journal │                                                       │
│    └─────────┘                                                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  SIMILARITY EDGES (embedding-based, weighted)            │       │
│  │                                                          │       │
│  │  Deposit A ◄──── 0.87 ────► Deposit B                   │       │
│  │  Deposit A ◄──── 0.72 ────► Deposit C                   │       │
│  │  Deposit B ◄──── 0.65 ────► Deposit C                   │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Node Types

| Node Label | Count (est.) | Properties |
|------------|-------------|------------|
| `Deposit` | 500 → 25,000 | name, location, tonnage, grade, status |
| `Country` | 200 | iso_code, name_en, name_zh |
| `MetallogenicProvince` | 100 | name, age_range, tectonic_setting |
| `DepositClassification` | 50 | code, name, path (ltree) |
| `Commodity` | 30 | code, name, chemical_symbol |
| `HostRock` | 500 | type, age, composition |
| `Alteration` | 20 | type, minerals, temperature_range |
| `Company` | 500 | name, ticker, country |
| `Paper` | 1,000 → 10,000 | title, doi, year |
| `Author` | 2,000 | name, orcid |
| `Institution` | 500 | name, ror_id |
| `Journal` | 100 | name, publisher, issn |
| `GeologicalTimeScale` | 200 | name, rank, age_range |

---

## Edge Types

| Edge Label | From | To | Properties | Cardinality |
|------------|------|----|-----------|-------------|
| `LOCATED_IN` | Deposit | Country | | M:1 |
| `WITHIN_PROVINCE` | Deposit | MetallogenicProvince | | M:1 |
| `CLASSIFIED_AS` | Deposit | DepositClassification | | M:1 |
| `PRODUCES` | Deposit | Commodity | role (primary/secondary) | M:N |
| `HAS_ALTERATION` | Deposit | Alteration | intensity | M:N |
| `HOSTED_IN` | Deposit | HostRock | | M:1 |
| `FORMED_IN` | Deposit | GeologicalTimeScale | min_age, max_age | M:N |
| `OPERATED_BY` | Deposit | Company | start_year, end_year | M:N |
| `STUDIED_IN` | Paper | Deposit | relevance | M:N |
| `AUTHORED_BY` | Paper | Author | author_order | M:N |
| `AFFILIATED_WITH` | Author | Institution | | M:1 |
| `PUBLISHED_IN` | Paper | Journal | year | M:1 |
| `SIMILAR_TO` | Deposit | Deposit | similarity_score, method | M:N |

---

## Cypher Query Examples

### Find all deposits in Andean porphyry belt

```cypher
MATCH (d:Deposit)-[:WITHIN_PROVINCE]->(p:MetallogenicProvince)
WHERE p.name CONTAINS 'Andean'
RETURN d.name, d.tonnage_mt, d.tonnage_grade_pct
ORDER BY d.tonnage_mt DESC
```

### Find authors who studied both porphyry and IOCG deposits

```cypher
MATCH (a:Author)-[:AUTHORED_BY]-(p:Paper)-[:STUDIED_IN]-(d:Deposit)
WHERE d.classification CONTAINS 'porphyry'
MATCH (a)-[:AUTHORED_BY]-(p2:Paper)-[:STUDIED_IN]-(d2:Deposit)
WHERE d2.classification CONTAINS 'IOCG'
RETURN DISTINCT a.name, count(DISTINCT d) as porphyry_count, count(DISTINCT d2) as iocg_count
```

### Shortest path between two deposits through shared geology

```cypher
MATCH path = shortestPath(
  (d1:Deposit {slug: 'chuquicamata'})-[*..5]-(d2:Deposit {slug: 'escondida'})
)
RETURN path
```

### Cluster deposits by tectonic setting + age

```cypher
MATCH (d:Deposit)-[:FORMED_IN]->(gts:GeologicalTimeScale)
MATCH (d)-[:WITHIN_PROVINCE]->(mp:MetallogenicProvince)
RETURN mp.tectonic_setting, gts.name, count(d), avg(d.tonnage_mt)
ORDER BY count(d) DESC
```

---

## Implementation Strategy

### Phase 3a — PostgreSQL Graph Extension (Recommended)
Use Apache AGE (PostgreSQL graph extension) or `pgsql-graph` for property graph
support directly in PostgreSQL. No separate database.

**Advantages**:
- Single database to manage
- Existing PostGIS data directly queryable
- ACID transactions across graph and relational data
- Lower operational complexity

### Phase 3b — Neo4j (Future, if needed)
If graph queries become a primary workload, migrate to Neo4j with
bidirectional sync to PostgreSQL.

---

## Embedding-Based Similarity (Phase 3)

### How it works

1. Generate text embedding for each deposit:
   ```
   text = f"{deposit.name}. {deposit.summary_en}.
           Host rock: {deposit.host_rock_type}.
           Tectonic setting: {deposit.tectonic_setting}.
           Classification: {deposit.classification.name_en}."
   embedding = text-embedding-3-small(text)  # 1536-dimensional vector
   ```

2. Store in PostgreSQL with pgvector:
   ```sql
   SELECT slug, name, 1 - (embedding <=> $target_embedding) AS similarity
   FROM ai_analyses
   WHERE deposit_id != $target_id
   ORDER BY embedding <=> $target_embedding
   LIMIT 10;
   ```

3. Materialize as graph edges:
   ```
   (deposit_a) -[:SIMILAR_TO {score: 0.87}]-> (deposit_b)
   ```

### Use Cases
- "Similar deposits" section on detail page
- Deposit clustering for prospectivity analysis
- Automated classification validation (does deposit cluster with its labeled type?)
