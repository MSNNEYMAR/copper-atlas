-- ============================================================================
-- Copper Atlas — Reference Tables
-- 全局铜矿床图谱 — 参考数据表
-- ============================================================================
-- These tables hold reference/lookup data that rarely changes.
-- They are the foundation that all other tables build upon.
-- ============================================================================

-- ============================================================================
-- COUNTRIES — ISO 3166 country reference with spatial boundaries
-- ============================================================================
CREATE TABLE countries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    iso_code        CHAR(2) NOT NULL UNIQUE,              -- ISO 3166-1 alpha-2 (e.g., 'CL', 'CN')
    iso_code_3      CHAR(3) NOT NULL UNIQUE,              -- ISO 3166-1 alpha-3 (e.g., 'CHL', 'CHN')
    iso_numeric     SMALLINT,                              -- ISO 3166-1 numeric (e.g., 152)
    name_en         VARCHAR(100) NOT NULL,
    name_zh         VARCHAR(100) NOT NULL,
    continent      VARCHAR(20),                           -- 'Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America', 'Antarctica'
    subregion      VARCHAR(50),                           -- UN subregion classification
    geom           GEOMETRY(MultiPolygon, 4326),          -- Low-resolution country boundary for display
    centroid       GEOMETRY(Point, 4326),                 -- Country centroid for label placement
    mineral_rank_copper SMALLINT,                         -- National rank in copper reserves/ production
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_countries_geom ON countries USING GIST (geom);
CREATE INDEX idx_countries_centroid ON countries USING GIST (centroid);
CREATE INDEX idx_countries_name_en ON countries USING GIST (name_en gist_trgm_ops);
CREATE INDEX idx_countries_name_zh ON countries USING GIST (name_zh gist_trgm_ops);
CREATE INDEX idx_countries_iso ON countries (iso_code);
CREATE INDEX idx_countries_continent ON countries (continent);

-- ============================================================================
-- DEPOSIT CLASSIFICATION — Hierarchical mineral deposit classification
-- ============================================================================
-- Uses PostgreSQL ltree for efficient hierarchical queries.
-- Example path: 'porphyry.cu_mo.calc_alkaline'
-- Query all porphyry deposits: WHERE path <@ 'porphyry'
-- Query all Cu-Mo subtypes:    WHERE path ~ 'porphyry.cu_mo.*'
-- ============================================================================
CREATE TABLE deposit_classification (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(50) NOT NULL UNIQUE,       -- Short machine-readable code: 'POR.CU_MO.CA'
    path                LTREE NOT NULL,                    -- Hierarchical path: 'por.cumo.ca'
    name_en             VARCHAR(200) NOT NULL,             -- 'Porphyry Cu-Mo (Calc-alkaline)'
    name_zh             VARCHAR(200) NOT NULL,             -- '斑岩铜钼型（钙碱性）'
    parent_code         VARCHAR(50),                       -- Parent classification code (self-referential)
    depth               SMALLINT NOT NULL DEFAULT 1,       -- 1=class, 2=subclass, 3=subtype
    description_en      TEXT,                              -- Full English description
    description_zh      TEXT,                              -- Full Chinese description

    -- Geological characteristics (typical ranges)
    typical_grade_range     NUMRANGE,                      -- e.g., [0.3, 1.2] %Cu
    typical_tonnage_range   NUMRANGE,                      -- e.g., [1, 5000] Mt
    tectonic_setting        VARCHAR(300),                  -- e.g., 'Continental arc, subduction zone'
    associated_rocks        TEXT[],                        -- e.g., {'granodiorite','quartz monzonite'}
    associated_alteration   TEXT[],                        -- Common alteration types

    -- Scientific references
    key_references          TEXT[],                        -- DOIs of defining publications
    definition_source       VARCHAR(300),                  -- e.g., 'Sillitoe, 2010', 'USGS Mineral Deposit Models'

    -- Metadata
    is_active               BOOLEAN DEFAULT true,
    sort_order              SMALLINT DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ltree-based hierarchical queries
CREATE INDEX idx_classification_path ON deposit_classification USING GIST (path);
CREATE INDEX idx_classification_path_btree ON deposit_classification USING BTREE (path);
CREATE INDEX idx_classification_parent ON deposit_classification (parent_code);
CREATE INDEX idx_classification_code ON deposit_classification (code);
CREATE INDEX idx_classification_name_en ON deposit_classification USING GIST (name_en gist_trgm_ops);

-- ============================================================================
-- GEOLOGICAL TIME SCALE — International Chronostratigraphic Chart
-- ============================================================================
-- Based on ICS (International Commission on Stratigraphy) 2024 standard.
-- Supports hierarchical queries via ltree.
-- Example path: 'phanerozoic.mesozoic.cretaceous.upper.maastrichtian'
-- ============================================================================
CREATE TABLE geological_time_scale (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en         VARCHAR(100) NOT NULL,                 -- 'Cretaceous'
    name_zh         VARCHAR(100) NOT NULL,                 -- '白垩纪'
    rank_en         VARCHAR(50) NOT NULL,                  -- 'Eon', 'Era', 'Period', 'Epoch', 'Age'
    rank_zh         VARCHAR(50) NOT NULL,                  -- '宙', '代', '纪', '世', '期'

    -- Numerical age boundaries (Million years before present)
    base_age_ma     NUMERIC(8, 3) NOT NULL,               -- Bottom/older boundary (larger number)
    top_age_ma      NUMERIC(8, 3) NOT NULL,                -- Top/younger boundary (smaller number)
    age_uncertainty_ma NUMERIC(5, 3),                     -- ± uncertainty in million years

    -- Hierarchy
    path            LTREE NOT NULL,                        -- Materialized path for tree queries
    parent_id       UUID REFERENCES geological_time_scale(id),

    -- GSSP (Global Boundary Stratotype Section and Point) — the "golden spike"
    gssp_location   VARCHAR(500),                          -- Geographic location of the type section
    gssp_latitude   NUMERIC,                               -- Latitude of GSSP
    gssp_longitude  NUMERIC,                               -- Longitude of GSSP
    gssp_description TEXT,                                 -- Description of the boundary marker

    -- ICS standard color codes for geological maps
    color_hex       CHAR(7),                               -- '#A6D988' — USGS/ICS standard color

    -- Metadata
    sort_order      SMALLINT DEFAULT 0,                    -- Chronological ordering
    is_active       BOOLEAN DEFAULT true,                  -- False for deprecated/ merged units
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (name_en, rank_en)
);

CREATE INDEX idx_geotime_path ON geological_time_scale USING GIST (path);
CREATE INDEX idx_geotime_path_btree ON geological_time_scale USING BTREE (path);
CREATE INDEX idx_geotime_parent ON geological_time_scale (parent_id);
CREATE INDEX idx_geotime_age_range ON geological_time_scale (base_age_ma, top_age_ma);
CREATE INDEX idx_geotime_name_en ON geological_time_scale USING GIST (name_en gist_trgm_ops);

-- ============================================================================
-- ALTERATION TYPE — Hydrothermal alteration classification
-- ============================================================================
CREATE TABLE alteration_type (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(30) NOT NULL UNIQUE,       -- 'potassic', 'phyllic', 'argillic'
    name_en             VARCHAR(100) NOT NULL,
    name_zh             VARCHAR(100) NOT NULL,
    description_en      TEXT,
    description_zh      TEXT,
    typical_minerals    TEXT[],                            -- {quartz, K-feldspar, biotite, magnetite}
    typical_zone        VARCHAR(50),                       -- 'inner', 'intermediate', 'outer'
    associated_deposit_types TEXT[],                       -- Which deposit types typically exhibit this
    temperature_range   INT4RANGE,                         -- Approximate formation T range (°C)
    sort_order          SMALLINT DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alteration_code ON alteration_type (code);

-- ============================================================================
-- MINERAL i18n — Internationalization for mineral categories
-- ============================================================================
CREATE TABLE mineral_i18n (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mineral_code    VARCHAR(30) NOT NULL,                  -- 'copper', 'gold', 'iron', 'lithium'
    language        CHAR(2) NOT NULL CHECK (language IN ('en', 'zh')),
    name            VARCHAR(200) NOT NULL,                 -- 'Copper' / '铜'
    description     TEXT,                                  -- Extended description in language
    chemical_symbol VARCHAR(10),                           -- 'Cu', 'Au', 'Fe', 'Li'
    group_name      VARCHAR(100),                          -- 'Base Metals', 'Precious Metals', 'Ferrous', 'Battery Metals'
    color_hex       CHAR(7),                              -- Primary display color for this mineral on maps
    sort_order      SMALLINT DEFAULT 0,
    is_enabled      BOOLEAN DEFAULT false,                 -- Feature flag: phased rollout
    phase           SMALLINT DEFAULT 1,                    -- Which phase introduces this mineral
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mineral_code, language)
);

CREATE INDEX idx_mineral_i18n_code ON mineral_i18n (mineral_code);

-- ============================================================================
-- DEPOSIT TYPE i18n — Internationalization for deposit classification display
-- ============================================================================
CREATE TABLE deposit_type_i18n (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classification_code VARCHAR(50) NOT NULL,              -- References deposit_classification.code
    language        CHAR(2) NOT NULL CHECK (language IN ('en', 'zh')),
    display_name    VARCHAR(200) NOT NULL,                 -- Short display name
    description     TEXT,                                  -- Extended description
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (classification_code, language)
);

CREATE INDEX idx_deposit_type_i18n_code ON deposit_type_i18n (classification_code);
