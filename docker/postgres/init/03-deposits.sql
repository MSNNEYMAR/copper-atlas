-- ============================================================================
-- Copper Atlas — Core Deposits Table and Related Entities
-- 全局铜矿床图谱 — 矿床主表及相关实体
-- ============================================================================
-- The deposits table is mineral-agnostic. Mineral type is determined by
-- the primary_mineral field (referencing mineral_i18n.mineral_code).
-- Adding a new mineral type requires NO schema changes.
-- ============================================================================

-- ============================================================================
-- DEPOSITS — Main deposit entity (mineral-agnostic core)
-- ============================================================================
CREATE TABLE deposits (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- === IDENTIFICATION ===
    slug                    VARCHAR(300) NOT NULL UNIQUE,       -- URL-safe identifier: 'chuquicamata'
    name                    VARCHAR(500) NOT NULL,              -- Primary deposit name (English preferred)
    name_zh                 VARCHAR(500),                       -- Chinese name
    alternative_names       TEXT[],                             -- Aliases, historical names, local names

    -- === MINERAL CLASSIFICATION (the extensibility point) ===
    primary_mineral         VARCHAR(30) NOT NULL DEFAULT 'copper', -- References mineral_i18n.mineral_code
    secondary_minerals      TEXT[],                             -- By-product/co-product minerals
    deposit_classification_id UUID NOT NULL REFERENCES deposit_classification(id),

    -- === LOCATION (spatial core) ===
    country_id              UUID NOT NULL REFERENCES countries(id),
    state_province          VARCHAR(200),                       -- First-level administrative division
    location                GEOMETRY(Point, 4326) NOT NULL,     -- WGS84 precise location
    location_approx         GEOMETRY(Point, 4326),              -- Approximate (for sensitive/undisclosed)
    location_source         GEOMETRY(Point),                    -- Original coordinate in source projection
    source_srid             INTEGER DEFAULT 4326,               -- EPSG code of the original coordinates
    location_precision_m    NUMERIC(8, 1),                      -- Estimated precision in meters
    elevation_m             NUMERIC(8, 1),                      -- Surface elevation in meters above sea level
    utm_zone                SMALLINT,                            -- UTM zone for localized mapping

    -- === RESOURCE ESTIMATES (tonnage and grade) ===
    -- All tonnages in million metric tonnes (Mt) of contained metal
    tonnage_mt              NUMERIC(12, 3),                     -- Best-estimate total contained metal
    tonnage_mt_low          NUMERIC(12, 3),                     -- P10 (low estimate)
    tonnage_mt_high         NUMERIC(12, 3),                     -- P90 (high estimate)
    tonnage_grade_pct       NUMERIC(6, 3),                      -- Average grade (% of contained metal in ore)
    tonnage_cutoff_pct      NUMERIC(6, 3),                      -- Cutoff grade used for resource calculation
    tonnage_confidence      VARCHAR(50),                        -- 'preliminary', 'NI43-101', 'JORC', 'historical', 'inferred'

    -- Reserve breakdown (Proven + Probable under JORC/CRIRSCO)
    proven_mt               NUMERIC(12, 3),
    probable_mt             NUMERIC(12, 3),
    measured_mt             NUMERIC(12, 3),
    indicated_mt            NUMERIC(12, 3),
    inferred_mt             NUMERIC(12, 3),

    -- === OPERATIONAL STATUS ===
    status                  VARCHAR(30) NOT NULL DEFAULT 'unknown', -- 'exploration','feasibility','development','production','suspended','closed','depleted','unknown'
    discovery_year          SMALLINT,
    production_start_year   SMALLINT,
    production_end_year     SMALLINT,
    operator_company        VARCHAR(300),
    owner_companies         TEXT[],
    mining_method           VARCHAR(200),                       -- 'open_pit', 'underground', 'block_caving', 'in_situ_leaching'

    -- === GEOLOGICAL CONTEXT ===
    host_rock_age_min_id    UUID REFERENCES geological_time_scale(id),    -- Oldest possible host rock age
    host_rock_age_max_id    UUID REFERENCES geological_time_scale(id),    -- Youngest possible host rock age
    mineralization_age_min_id UUID REFERENCES geological_time_scale(id),  -- Oldest possible mineralization age
    mineralization_age_max_id UUID REFERENCES geological_time_scale(id),  -- Youngest possible mineralization age
    mineralization_age_method   VARCHAR(50),                              -- 'U-Pb_zircon','Re-Os_molybdenite','Ar-Ar_sericite','K-Ar_biotite','Rb-Sr'
    mineralization_age_ma      NUMERIC(7, 3),                            -- Absolute age in million years
    mineralization_age_error_ma NUMERIC(5, 3),                           -- ± error
    host_rock_type          VARCHAR(300),                                -- 'Granodiorite porphyry','Andesite','Limestone'
    host_rock_age_text      VARCHAR(200),                                -- Free-text fallback (e.g., 'Late Cretaceous')
    tectonic_setting        VARCHAR(300),                                -- Tectonic environment
    geological_province     VARCHAR(300),                                -- e.g., 'Central Asian Orogenic Belt'
    metallogenic_belt       VARCHAR(300),                                -- e.g., 'Andean Porphyry Belt'

    -- === DESCRIPTION ===
    summary_en              TEXT,                                        -- English summary paragraph
    summary_zh              TEXT,                                        -- Chinese summary paragraph
    geology_en              TEXT,                                        -- Detailed English geological description
    geology_zh              TEXT,                                        -- Detailed Chinese geological description

    -- === DATA PROVENANCE (core pointer to provenance system) ===
    data_source             VARCHAR(500),                                -- Source organization/publication
    data_source_url         TEXT,                                        -- URL to source
    reference_dois          TEXT[],                                      -- DOI references
    last_verified_date      DATE,                                        -- When data was last verified by a human
    data_quality_score      SMALLINT CHECK (data_quality_score BETWEEN 1 AND 5), -- 1=unverified, 5=peer-reviewed

    -- === MEDIA ===
    images                  TEXT[],                                      -- URLs to deposit images
    documents               TEXT[],                                      -- URLs to technical reports, NI 43-101, etc.

    -- === EXTENSIBLE PROPERTIES (per-mineral custom data) ===
    -- Copper-specific: {'supergene_enrichment':true, 'oxide_zone_depth_m':150, 'hypogene_zone_depth_m':800}
    -- Lithium-specific:  {'brine_type':'salar', 'li_concentration_mg_l':1500, 'mg_li_ratio':6.5}
    -- Gold-specific:      {'recovery_rate_pct':92.5, 'ore_type':'oxide', 'nugget_effect':'moderate'}
    properties              JSONB DEFAULT '{}',

    -- === METADATA ===
    is_featured             BOOLEAN NOT NULL DEFAULT false,              -- Editor-curated highlight
    is_public               BOOLEAN NOT NULL DEFAULT true,               -- Visibility toggle
    is_active               BOOLEAN NOT NULL DEFAULT true,               -- Soft delete
    tags                    TEXT[],                                      -- Free-form tags
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              VARCHAR(100),                                -- Future: user reference
    updated_by              VARCHAR(100)
);

-- ============================================================================
-- SPATIAL INDEXES — Most critical for performance
-- ============================================================================
CREATE INDEX idx_deposits_location ON deposits USING GIST (location);
CREATE INDEX idx_deposits_location_approx ON deposits USING GIST (location_approx);
CREATE INDEX idx_deposits_location_source ON deposits USING GIST (location_source);

-- ============================================================================
-- QUERY INDEXES — Optimized for common filter combinations
-- ============================================================================
CREATE INDEX idx_deposits_primary_mineral ON deposits (primary_mineral);
CREATE INDEX idx_deposits_status ON deposits (status);
CREATE INDEX idx_deposits_classification ON deposits (deposit_classification_id);
CREATE INDEX idx_deposits_country ON deposits (country_id);
CREATE INDEX idx_deposits_slug ON deposits (slug);
CREATE INDEX idx_deposits_featured ON deposits (is_featured) WHERE is_featured = true;
CREATE INDEX idx_deposits_public ON deposits (is_public) WHERE is_public = true;
CREATE INDEX idx_deposits_active ON deposits (is_active) WHERE is_active = true;

-- === NUMERICAL INDEXES (partial indexes for non-null values) ===
CREATE INDEX idx_deposits_tonnage ON deposits (tonnage_mt) WHERE tonnage_mt IS NOT NULL;
CREATE INDEX idx_deposits_grade ON deposits (tonnage_grade_pct) WHERE tonnage_grade_pct IS NOT NULL;
CREATE INDEX idx_deposits_discovery_year ON deposits (discovery_year) WHERE discovery_year IS NOT NULL;

-- === COMPOSITE INDEXES (for multi-filter queries) ===
CREATE INDEX idx_deposits_mineral_status ON deposits (primary_mineral, status);
CREATE INDEX idx_deposits_mineral_class ON deposits (primary_mineral, deposit_classification_id);
CREATE INDEX idx_deposits_country_mineral ON deposits (country_id, primary_mineral);
CREATE INDEX idx_deposits_country_status ON deposits (country_id, status);

-- === GEOLOGICAL INDEXES ===
CREATE INDEX idx_deposits_host_rock_min ON deposits (host_rock_age_min_id);
CREATE INDEX idx_deposits_host_rock_max ON deposits (host_rock_age_max_id);
CREATE INDEX idx_deposits_min_age ON deposits (mineralization_age_min_id);
CREATE INDEX idx_deposits_min_age_max ON deposits (mineralization_age_max_id);

-- === FULL-TEXT SEARCH ===
CREATE INDEX idx_deposits_search_en ON deposits
    USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary_en, '')));
CREATE INDEX idx_deposits_name_trgm ON deposits USING GIN (name gin_trgm_ops);
CREATE INDEX idx_deposits_tags ON deposits USING GIN (tags);

-- === JSONB INDEX (for mineral-specific property queries) ===
CREATE INDEX idx_deposits_properties ON deposits USING GIN (properties jsonb_path_ops);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposits_updated_at
    BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DEPOSIT ALTERATION — Junction: deposit <-> alteration_type
-- ============================================================================
CREATE TABLE deposit_alteration (
    deposit_id      UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    alteration_id   UUID NOT NULL REFERENCES alteration_type(id) ON DELETE CASCADE,
    intensity       SMALLINT CHECK (intensity BETWEEN 1 AND 5),   -- 1=weak, 5=pervasive
    spatial_extent  VARCHAR(100),                                  -- 'pervasive','selective','vein_selvage','breccia_fill'
    description     TEXT,                                          -- Deposit-specific alteration notes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (deposit_id, alteration_id)
);

CREATE INDEX idx_deposit_alteration_deposit ON deposit_alteration (deposit_id);
CREATE INDEX idx_deposit_alteration_type ON deposit_alteration (alteration_id);

-- ============================================================================
-- MINERAL PARAGENESIS — Mineral paragenetic sequence per deposit
-- ============================================================================
CREATE TABLE mineral_paragenesis (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deposit_id      UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    mineral_name    VARCHAR(200) NOT NULL,                          -- 'Chalcopyrite', 'Bornite', etc.
    mineral_formula VARCHAR(200),                                   -- 'CuFeS2'
    stage           VARCHAR(50),                                    -- 'pre_ore','early_ore','main_ore','late_ore','post_ore','supergene'
    occurrence      VARCHAR(200),                                   -- 'disseminated','vein','breccia_matrix','massive','stockwork'
    relative_timing SMALLINT,                                       -- 1=earliest, higher=later in paragenetic sequence
    abundance       VARCHAR(50),                                    -- 'major','minor','trace','accessory'
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_paragenesis_deposit ON mineral_paragenesis (deposit_id);
CREATE INDEX idx_paragenesis_stage ON mineral_paragenesis (stage);

-- ============================================================================
-- RESOURCE ESTIMATES — Versioned resource estimates with reporting standards
-- ============================================================================
CREATE TABLE resource_estimates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deposit_id          UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    mineral_code        VARCHAR(30) NOT NULL,                      -- Which mineral this estimate is for
    reporting_standard  VARCHAR(30) NOT NULL,                      -- 'JORC_2012','NI_43_101','CRIRSCO_2019','PERC_2021','SAMREC','historical'
    classification      VARCHAR(50) NOT NULL,                      -- As-stated in report: 'Measured','Indicated','Inferred'

    -- Normalized confidence (computed via trigger or application logic)
    normalized_confidence VARCHAR(20) NOT NULL,                    -- 'measured','indicated','inferred','proven','probable'

    tonnage_mt          NUMERIC(12, 3) NOT NULL,                   -- million tonnes of contained metal
    tonnage_ore_mt      NUMERIC(12, 3),                            -- million tonnes of ore (total rock)
    grade_pct           NUMERIC(6, 3),                              -- average grade (%)
    cutoff_grade_pct    NUMERIC(6, 3),                              -- cutoff grade used

    report_date         DATE NOT NULL,                             -- Publication date of the estimate
    effective_date      DATE,                                      -- Effective date of the resource
    report_source       VARCHAR(300),                              -- Company/consultant that prepared the estimate
    report_title        VARCHAR(500),                              -- Title of the technical report
    report_url          TEXT,                                      -- Link to the report (e.g., SEDAR, ASX)
    report_doi          TEXT,                                      -- DOI if published

    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          VARCHAR(100)
);

CREATE INDEX idx_resource_estimates_deposit ON resource_estimates (deposit_id);
CREATE INDEX idx_resource_estimates_mineral ON resource_estimates (mineral_code);
CREATE INDEX idx_resource_estimates_date ON resource_estimates (report_date);
CREATE INDEX idx_resource_estimates_classification ON resource_estimates (normalized_confidence);

-- ============================================================================
-- PRODUCTION HISTORY — Annual production records
-- ============================================================================
CREATE TABLE production_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deposit_id      UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    year            SMALLINT NOT NULL,
    ore_tonnes_mt   NUMERIC(10, 3),                                -- Ore processed (million tonnes)
    metal_tonnes    NUMERIC(10, 3),                                -- Contained metal produced (tonnes, not Mt)
    grade_pct       NUMERIC(6, 3),                                  -- Head grade (%)
    recovery_pct    NUMERIC(5, 2),                                  -- Metallurgical recovery (%)
    source          VARCHAR(300),                                   -- Data source (company report, government, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deposit_id, year)
);

CREATE INDEX idx_production_history_deposit ON production_history (deposit_id);
CREATE INDEX idx_production_history_year ON production_history (year);
