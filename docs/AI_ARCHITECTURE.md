# Copper Atlas — AI Architecture

> 全球铜矿床图谱 — AI 架构设计
> Version 1.0 · 2026-07-04 · Phase 2-3

---

## Design Principle

> **AI augments. Humans decide.**
>
> AI writes summaries from peer-reviewed papers, not invents deposits.
> Every AI output is labeled, versioned, and human-reviewed before publication.

---

## AI Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI AUGMENTATION PIPELINE                     │
│                                                                  │
│  INPUT                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Paper   │  │  Report  │  │  Deposit │                      │
│  │  (PDF)   │  │ (NI43-101)│  │ (existing│                      │
│  └────┬─────┘  └────┬─────┘  │  record) │                      │
│       │              │        └────┬─────┘                      │
│       └──────────────┴─────────────┘                             │
│                     │                                            │
│          ┌──────────▼──────────┐                                 │
│          │  1. TEXT EXTRACT    │  pdfplumber / CrossRef API      │
│          │  Extract full text, │                                 │
│          │  tables, metadata   │                                 │
│          └──────────┬──────────┘                                 │
│                     │                                            │
│          ┌──────────▼──────────┐                                 │
│          │  2. CHUNK & PARSE   │  Split into sections            │
│          │  Abstract, Geology, │  (abstract, geology, resources, │
│          │  Resources, Methods │   discussion)                   │
│          └──────────┬──────────┘                                 │
│                     │                                            │
│     ┌───────────────┼───────────────┐                            │
│     │               │               │                            │
│  ┌──▼──────┐  ┌─────▼──────┐  ┌────▼──────────┐                 │
│  │ 3a.     │  │ 3b.        │  │ 3c.           │                 │
│  │ SUMMARIZE│  │ EXTRACT    │  │ CLASSIFY      │                 │
│  │         │  │            │  │               │                 │
│  │ GPT-4o: │  │ GPT-4o:    │  │ GPT-4o:       │                 │
│  │ 150-word│  │ tonnage,   │  │ deposit type, │                 │
│  │ summary │  │ grade,     │  │ tectonic      │                 │
│  │ (EN+ZH) │  │ host rock, │  │ setting,      │                 │
│  │         │  │ age, method│  │ confidence    │                 │
│  └──┬──────┘  └─────┬──────┘  └────┬──────────┘                 │
│     │               │               │                            │
│     └───────────────┼───────────────┘                            │
│                     │                                            │
│          ┌──────────▼──────────┐                                 │
│          │  4. VALIDATE        │  Cross-check extracted values   │
│          │  Compare AI output  │  against manual entry           │
│          │  with source text   │  Flag discrepancies             │
│          └──────────┬──────────┘                                 │
│                     │                                            │
│          ┌──────────▼──────────┐                                 │
│          │  5. STORE           │  ai_analyses table              │
│          │  summary, keywords, │  human_reviewed = false         │
│          │  embedding,         │  prompt_used for reproducibility│
│          │  confidence         │                                 │
│          └──────────┬──────────┘                                 │
│                     │                                            │
│          ┌──────────▼──────────┐                                 │
│          │  6. HUMAN REVIEW    │  Reviewer approves/edits/       │
│          │  (mandatory gate)   │  rejects. Sets human_reviewed=T │
│          └──────────┬──────────┘                                 │
│                     │                                            │
│                     ▼                                            │
│               PUBLISHED                                          │
│         (summary visible on detail page,                         │
│          embedding enables similar deposit search)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Use Cases

### Use Case 1: Paper Summarization

```
Input:  "Porphyry Copper Systems" — Sillitoe, R.H. (2010), Economic Geology
        → PDF → pdfplumber → full text (15,000 words)

Output:
  summary_en: "Comprehensive review of porphyry copper systems..."
  summary_zh: "斑岩铜矿系统的全面综述..."
  keywords: ["porphyry copper","magmatic-hydrothermal","subduction","exploration"]
  extracted_entities:
    - deposit_types: ["porphyry Cu-Mo","porphyry Cu-Au"]
    - age_range: "Mesozoic-Cenozoic"
    - tectonic: "convergent plate margins"
  confidence: 0.92
  human_reviewed: TRUE
```

### Use Case 2: NI 43-101 Data Extraction

```
Input:  "Technical Report on the Escondida Mine" — BHP (2023)
        → PDF table extraction → GPT-4o structured extraction

Output:
  proven_reserves: 4,500 Mt @ 0.55% Cu
  probable_reserves: 3,200 Mt @ 0.48% Cu
  measured_resources: ...
  cutoff_grade: 0.30% Cu
  mining_method: open_pit
  mine_life: 30 years
  confidence: 0.85

  → Human reviewer verifies against PDF tables
  → Approved → inserted into resource_estimates table
```

### Use Case 3: Similar Deposit Search (Embedding)

```
1. Generate embedding for every deposit summary (text-embedding-3-small, 1536d)
2. Store in ai_analyses.embedding (pgvector)
3. Query: "show me deposits similar to Chuquicamata"
   → SELECT deposit_id FROM ai_analyses
     ORDER BY embedding <=> (SELECT embedding FROM ai_analyses WHERE deposit_id = $1)
     LIMIT 10
4. Returns: Escondida, Collahuasi, El Teniente, Bingham Canyon, Morenci...
```

### Use Case 4: Mineral Prospectivity (Research, Phase 4+)

```
Input:  Known deposit locations + geological feature layers
Model:  Random Forest / XGBoost / Graph Neural Network
Output: Prospectivity heatmap (probability of undiscovered Cu deposit)

⚠️ Research use only. Not published as "prediction" without peer review.
```

---

## Model Selection

| Task | Model | Rationale |
|------|-------|-----------|
| Summarization (EN) | GPT-4o / Claude Opus | Best quality, handles technical text |
| Summarization (ZH) | GPT-4o / DeepSeek | Native Chinese capability |
| Structured extraction | GPT-4o with function calling | Reliable JSON output |
| Classification | GPT-4o | Can match deposit descriptions to classification hierarchy |
| Embedding | text-embedding-3-small | 1536d, good performance/cost ratio |
| Prospectivity (future) | XGBoost / GNN | Interpretable, good with spatial features |

---

## Prompt Engineering Standards

### Reproducibility

Every prompt is stored in `ai_analyses.prompt_used`. This enables:
- Prompt version tracking
- A/B testing prompt variants
- Regression testing (does new prompt produce better results?)
- Academic reproducibility

### Prompt Template

```python
PROMPT_SUMMARIZE = """
You are a geology expert specializing in economic geology and mineral deposits.

TASK: Summarize the following geological description of a copper deposit.
- Write exactly 150 words in English
- Focus on: deposit type, host rock, mineralization age, tectonic setting, ore minerals
- Use professional geological terminology
- Do NOT invent information not present in the text
- If information is missing, state "not described in source"

SOURCE TEXT:
{text}

SUMMARY:
"""
```

---

## AI Content Labeling (Mandatory)

Every AI-generated or AI-assisted field must carry metadata:

```json
{
  "field": "summary_en",
  "ai_generated": true,
  "ai_model": "GPT-4o",
  "ai_model_version": "gpt-4o-2024-08-06",
  "ai_confidence": 0.92,
  "human_reviewed": true,
  "reviewer_id": "uuid",
  "review_date": "2024-07-04",
  "prompt_version": "v2.1"
}
```

Display to users:
- ✅ "AI-assisted summary, human-reviewed" (green badge)
- ⚠️ "AI-generated summary, pending review" (yellow badge)
- ❌ "AI-generated, not reviewed" — never shown publicly

---

## Cost & Rate Limiting

| Operation | Model | Est. Cost/Deposit | Rate Limit |
|-----------|-------|-------------------|------------|
| Summarize | GPT-4o | $0.01 | 100/day |
| Extract data | GPT-4o | $0.02 | 100/day |
| Classify | GPT-4o | $0.005 | 500/day |
| Embed | text-embedding-3-small | $0.0001 | 10,000/day |

**Budget**: $10/month during development. $100/month at scale (10,000 deposits).
