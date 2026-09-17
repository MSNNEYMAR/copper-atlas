-- ============================================================================
-- Copper Atlas — Data Provenance System (PROV-O Compliant)
-- 全局铜矿床图谱 — 数据溯源系统（W3C PROV-O 标准兼容）
-- ============================================================================
-- This implements the W3C PROV-O (Provenance Ontology) data model.
-- Every data point can be traced to its origin, every transformation recorded.
-- This is essential for: scientific credibility, data papers, audit trails.
--
-- PROV-O Core Concepts:
--   Entity   = data items with identity (a deposit record version, an image)
--   Activity = actions that generate or modify entities (data import, manual edit)
--   Agent    = who/what performed the activity (person, organization, software)
-- ============================================================================

-- ============================================================================
-- PROVENANCE AGENT — Who or what produced/ modified the data
-- ============================================================================
CREATE TABLE provenance_agent (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type      VARCHAR(20) NOT NULL CHECK (agent_type IN ('person', 'organization', 'software')),

    -- Identification
    name            VARCHAR(300) NOT NULL,
    orcid           VARCHAR(19),                                    -- ORCID identifier (format: 0000-0002-1825-0097)
    ror_id          VARCHAR(20),                                    -- Research Organization Registry ID
    email           VARCHAR(200),
    affiliation     VARCHAR(300),

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (orcid),
    UNIQUE (ror_id)
);

CREATE INDEX idx_prov_agent_type ON provenance_agent (agent_type);

-- ============================================================================
-- PROVENANCE ACTIVITY — Actions that produced or modified data entities
-- ============================================================================
CREATE TABLE provenance_activity (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type       VARCHAR(50) NOT NULL,                      -- 'data_import','manual_edit','expert_review','georeferencing','calculation','validation','publication'

    -- Description
    description         TEXT NOT NULL,                             -- Human-readable: "Imported USGS MRDS copper deposits dataset v3.2"
    software_used       VARCHAR(200),                              -- Software/tool used: 'QGIS 3.34', 'Python script v2.1', 'manual'
    software_version    VARCHAR(50),

    -- Temporal
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    duration_ms         INTEGER,                                   -- Computed duration in milliseconds

    -- Input/Output entity references (array of UUIDs for flexible linking)
    input_entity_refs   UUID[],                                    -- What data was consumed
    output_entity_refs  UUID[],                                    -- What data was produced

    -- Context
    parameters          JSONB DEFAULT '{}',                        -- e.g., {"source_url":"...", "records_imported": 487, "errors": 12}
    status              VARCHAR(20) DEFAULT 'completed',           -- 'pending','in_progress','completed','failed'

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prov_activity_type ON provenance_activity (activity_type);
CREATE INDEX idx_prov_activity_started ON provenance_activity (started_at);

-- ============================================================================
-- PROVENANCE ENTITY — Versioned snapshots of data items
-- ============================================================================
-- Each row is an immutable version of a data entity.
-- For deposits: entity_type='deposit', entity_id=<deposit UUID>, version=1,2,3...
-- This allows: "show me what this deposit record looked like on 2024-03-15"
-- ============================================================================
CREATE TABLE provenance_entity (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type     VARCHAR(50) NOT NULL,                          -- 'deposit','resource_estimate','production_record','alteration','paragenesis','image'
    entity_id       UUID NOT NULL,                                 -- FK to the actual record (not enforced for flexibility across entity types)
    version         INTEGER NOT NULL DEFAULT 1,
    data            JSONB NOT NULL,                                -- Complete snapshot of the entity at this version
    checksum        VARCHAR(64) NOT NULL,                          -- SHA-256 hash of data for integrity verification
    is_current      BOOLEAN NOT NULL DEFAULT false,                -- Is this the current version?

    -- Timestamp
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (entity_type, entity_id, version)
);

CREATE INDEX idx_prov_entity_type_id ON provenance_entity (entity_type, entity_id);
CREATE INDEX idx_prov_entity_current ON provenance_entity (entity_type, entity_id, is_current)
    WHERE is_current = true;
CREATE INDEX idx_prov_entity_data ON provenance_entity USING GIN (data jsonb_path_ops);

-- ============================================================================
-- PROVENANCE RELATIONSHIPS — Junction tables linking Entity-Activity-Agent
-- ============================================================================

-- Entity was attributed to Agent (who authored/contributed)
CREATE TABLE provenance_was_attributed_to (
    entity_id       UUID NOT NULL REFERENCES provenance_entity(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES provenance_agent(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'author',         -- 'author','contributor','publisher','curator','reviewer'
    PRIMARY KEY (entity_id, agent_id, role)
);

-- Entity was generated by Activity
CREATE TABLE provenance_was_generated_by (
    entity_id       UUID NOT NULL REFERENCES provenance_entity(id) ON DELETE CASCADE,
    activity_id     UUID NOT NULL REFERENCES provenance_activity(id) ON DELETE CASCADE,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (entity_id, activity_id)
);

-- Activity was associated with Agent (who performed it)
CREATE TABLE provenance_was_associated_with (
    activity_id     UUID NOT NULL REFERENCES provenance_activity(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES provenance_agent(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'executor',       -- 'executor','supervisor','approver'
    PRIMARY KEY (activity_id, agent_id, role)
);

-- Activity used Entity (input data)
CREATE TABLE provenance_used (
    activity_id     UUID NOT NULL REFERENCES provenance_activity(id) ON DELETE CASCADE,
    entity_id       UUID NOT NULL REFERENCES provenance_entity(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, entity_id)
);

-- ============================================================================
-- PROVENANCE HELPER FUNCTION — Auto-create provenance_entity on deposit change
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_create_deposit_provenance()
RETURNS TRIGGER AS $$
DECLARE
    v_checksum VARCHAR(64);
    v_last_version INTEGER;
BEGIN
    -- Compute SHA-256 checksum of the full row data
    v_checksum := encode(
        digest(row_to_json(NEW)::text, 'sha256'),
        'hex'
    );

    -- Find the last version number
    SELECT COALESCE(MAX(version), 0) INTO v_last_version
    FROM provenance_entity
    WHERE entity_type = 'deposit' AND entity_id = NEW.id;

    -- Mark all previous versions as not current
    UPDATE provenance_entity
    SET is_current = false
    WHERE entity_type = 'deposit' AND entity_id = NEW.id AND is_current = true;

    -- Insert new provenance entity with the complete row as a snapshot
    INSERT INTO provenance_entity (
        entity_type, entity_id, version, data, checksum, is_current
    ) VALUES (
        'deposit', NEW.id, v_last_version + 1, row_to_json(NEW)::jsonb, v_checksum, true
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on deposit INSERT or UPDATE to auto-capture provenance
CREATE TRIGGER trg_deposit_provenance
    AFTER INSERT OR UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION fn_create_deposit_provenance();
