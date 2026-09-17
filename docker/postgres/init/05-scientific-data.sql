-- ============================================================================
-- Copper Atlas — Scientific Data Infrastructure
-- 全局铜矿床图谱 — 科研数据基础设施
-- ============================================================================
-- Tables supporting scientific data publication, cross-database interoperability,
-- and dataset versioning with DOI assignment.
-- ============================================================================

-- ============================================================================
-- EXTERNAL IDENTIFIER — Cross-database mapping
-- ============================================================================
-- Maps Copper Atlas deposit IDs to external databases, enabling interoperability
-- with USGS, Mindat, Wikidata, and other geological data repositories.
-- ============================================================================
CREATE TABLE external_identifier (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deposit_id          UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,

    -- Identifier metadata
    identifier_type     VARCHAR(50) NOT NULL,                      -- 'usgs_mrds','mindat','igeon','igsn','wikidata','ror','doi','openalex'
    identifier          VARCHAR(300) NOT NULL,                      -- The actual ID in the external system
    identifier_url      TEXT,                                       -- Full URL to the external resource

    -- Verification
    verified            BOOLEAN DEFAULT false,                      -- Has this mapping been verified?
    verified_date       DATE,
    verified_by         UUID REFERENCES provenance_agent(id),

    -- Metadata
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (deposit_id, identifier_type),                           -- One ID per type per deposit
    UNIQUE (identifier_type, identifier)                            -- Avoid duplicate external IDs
);

CREATE INDEX idx_external_id_deposit ON external_identifier (deposit_id);
CREATE INDEX idx_external_id_type ON external_identifier (identifier_type);
CREATE INDEX idx_external_id_value ON external_identifier (identifier);

-- ============================================================================
-- DATASET RELEASE — Versioned dataset snapshots for scientific publication
-- ============================================================================
-- Each release is a frozen, citable version of the entire dataset.
-- Supports DOI assignment (via Zenodo, Figshare, or DataCite).
-- Enables: "According to Copper Atlas v2.3 (DOI: 10.xxxx/yyyy), global copper reserves are..."
-- ============================================================================
CREATE TABLE dataset_release (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Versioning (semantic versioning)
    version_tag         VARCHAR(20) NOT NULL UNIQUE,               -- 'v1.0.0', 'v2.1.0' (semver)
    is_major            BOOLEAN DEFAULT false,                      -- Major release with breaking schema changes
    is_current          BOOLEAN DEFAULT false,                      -- Is this the recommended current release?

    -- DOI (assigned after Zenodo/Figshare deposit)
    doi                 VARCHAR(100),                               -- '10.5281/zenodo.xxxxxxx'
    doi_url             TEXT,                                       -- 'https://doi.org/10.5281/zenodo.xxxxxxx'
    zenodo_deposit_id   INTEGER,                                   -- Zenodo deposit ID for API integration
    zenodo_concept_doi  VARCHAR(100),                              -- Concept DOI (all versions)

    -- Release metadata
    release_date        DATE NOT NULL,
    release_notes_en    TEXT,                                       -- English changelog for this release
    release_notes_zh    TEXT,                                       -- Chinese changelog
    record_count        INTEGER NOT NULL,                           -- Total deposit records in this release
    copper_record_count INTEGER,                                   -- Copper-specific records
    data_package_url    TEXT,                                       -- URL to downloadable data package (GeoJSON/CSV/GeoPackage)

    -- Data quality summary
    quality_score_avg   NUMERIC(3, 1),                              -- Average data_quality_score across records
    verified_record_pct NUMERIC(4, 1),                              -- % of records with last_verified_date set
    with_tonnage_pct    NUMERIC(4, 1),                              -- % of records with tonnage data
    with_grade_pct      NUMERIC(4, 1),                              -- % of records with grade data
    with_age_pct        NUMERIC(4, 1),                              -- % of records with mineralization age data

    -- Provenance
    created_by          UUID REFERENCES provenance_agent(id),
    release_activity_id UUID REFERENCES provenance_activity(id),   -- Which activity produced this release

    -- License
    data_license        VARCHAR(100) DEFAULT 'CC-BY-4.0',         -- SPDX license identifier for the DATA
    code_license        VARCHAR(100) DEFAULT 'MIT',                -- SPDX license for the SOFTWARE

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_release_version ON dataset_release (version_tag);
CREATE INDEX idx_release_current ON dataset_release (is_current) WHERE is_current = true;
CREATE INDEX idx_release_date ON dataset_release (release_date);

-- ============================================================================
-- DATASET SNAPSHOT — The actual frozen data for each release
-- ============================================================================
-- Each row is one deposit's complete data at the time of the release.
-- This is intentionally denormalized for archival integrity.
-- ============================================================================
CREATE TABLE dataset_snapshot (
    release_id      UUID NOT NULL REFERENCES dataset_release(id) ON DELETE CASCADE,
    deposit_id      UUID NOT NULL,
    snapshot_data   JSONB NOT NULL,                                -- Complete deposit record at release time
    checksum        VARCHAR(64) NOT NULL,                          -- SHA-256 for data integrity
    PRIMARY KEY (release_id, deposit_id)
);

CREATE INDEX idx_snapshot_deposit ON dataset_snapshot (deposit_id);
