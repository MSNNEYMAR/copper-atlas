"""
Copper Atlas — Initial Database Migration
全局铜矿床图谱 — 初始数据库迁移

Revision: 0001
Create: All 16 tables with PostGIS extensions, indexes, and triggers.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables for the initial Copper Atlas schema."""

    # === Extensions ===
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology")
    op.execute("CREATE EXTENSION IF NOT EXISTS ltree")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

    # === Countries ===
    op.create_table(
        "countries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("iso_code", sa.String(2), unique=True, nullable=False),
        sa.Column("iso_code_3", sa.String(3), unique=True, nullable=False),
        sa.Column("iso_numeric", sa.SmallInteger()),
        sa.Column("name_en", sa.String(100), nullable=False),
        sa.Column("name_zh", sa.String(100), nullable=False),
        sa.Column("continent", sa.String(20)),
        sa.Column("subregion", sa.String(50)),
        sa.Column("geom", postgresql.GEOMETRY("MULTIPOLYGON", srid=4326)),
        sa.Column("centroid", postgresql.GEOMETRY("POINT", srid=4326)),
        sa.Column("mineral_rank_copper", sa.SmallInteger()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_countries_geom", "countries", ["geom"], postgresql_using="gist")
    op.create_index("idx_countries_centroid", "countries", ["centroid"], postgresql_using="gist")
    op.create_index("idx_countries_name_en", "countries", ["name_en"], postgresql_using="gist", postgresql_ops={"name_en": "gist_trgm_ops"})
    op.create_index("idx_countries_iso", "countries", ["iso_code"])

    # === Deposit Classification ===
    op.create_table(
        "deposit_classification",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("path", postgresql.LTREE(), nullable=False),
        sa.Column("name_en", sa.String(200), nullable=False),
        sa.Column("name_zh", sa.String(200), nullable=False),
        sa.Column("parent_code", sa.String(50)),
        sa.Column("depth", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("description_en", sa.Text()),
        sa.Column("description_zh", sa.Text()),
        sa.Column("typical_grade_range", postgresql.NUMRANGE()),
        sa.Column("typical_tonnage_range", postgresql.NUMRANGE()),
        sa.Column("tectonic_setting", sa.String(300)),
        sa.Column("associated_rocks", postgresql.ARRAY(sa.Text())),
        sa.Column("associated_alteration", postgresql.ARRAY(sa.Text())),
        sa.Column("key_references", postgresql.ARRAY(sa.Text())),
        sa.Column("definition_source", sa.String(300)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_classification_path", "deposit_classification", ["path"], postgresql_using="gist")
    op.create_index("idx_classification_code", "deposit_classification", ["code"])

    # === Geological Time Scale ===
    op.create_table(
        "geological_time_scale",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name_en", sa.String(100), nullable=False),
        sa.Column("name_zh", sa.String(100), nullable=False),
        sa.Column("rank_en", sa.String(50), nullable=False),
        sa.Column("rank_zh", sa.String(50), nullable=False),
        sa.Column("base_age_ma", sa.Numeric(8, 3), nullable=False),
        sa.Column("top_age_ma", sa.Numeric(8, 3), nullable=False),
        sa.Column("age_uncertainty_ma", sa.Numeric(5, 3)),
        sa.Column("path", postgresql.LTREE(), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True)),
        sa.Column("gssp_location", sa.String(500)),
        sa.Column("gssp_latitude", sa.Numeric()),
        sa.Column("gssp_longitude", sa.Numeric()),
        sa.Column("gssp_description", sa.Text()),
        sa.Column("color_hex", sa.String(7)),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_geotime_path", "geological_time_scale", ["path"], postgresql_using="gist")
    op.create_index("idx_geotime_parent", "geological_time_scale", ["parent_id"])

    # === Alteration Type ===
    op.create_table(
        "alteration_type",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("code", sa.String(30), unique=True, nullable=False),
        sa.Column("name_en", sa.String(100), nullable=False),
        sa.Column("name_zh", sa.String(100), nullable=False),
        sa.Column("description_en", sa.Text()),
        sa.Column("description_zh", sa.Text()),
        sa.Column("typical_minerals", postgresql.ARRAY(sa.Text())),
        sa.Column("typical_zone", sa.String(50)),
        sa.Column("associated_deposit_types", postgresql.ARRAY(sa.Text())),
        sa.Column("temperature_range", postgresql.INT4RANGE()),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === Deposits (central table) ===
    op.create_table(
        "deposits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        # Identification
        sa.Column("slug", sa.String(300), unique=True, nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("name_zh", sa.String(500)),
        sa.Column("alternative_names", postgresql.ARRAY(sa.Text())),
        # Mineral
        sa.Column("primary_mineral", sa.String(30), nullable=False, server_default="copper"),
        sa.Column("secondary_minerals", postgresql.ARRAY(sa.Text())),
        sa.Column("deposit_classification_id", postgresql.UUID(as_uuid=True), nullable=False),
        # Location
        sa.Column("country_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("state_province", sa.String(200)),
        sa.Column("location", postgresql.GEOMETRY("POINT", srid=4326), nullable=False),
        sa.Column("location_approx", postgresql.GEOMETRY("POINT", srid=4326)),
        sa.Column("location_source", postgresql.GEOMETRY("POINT")),
        sa.Column("source_srid", sa.Integer(), server_default="4326"),
        sa.Column("location_precision_m", sa.Numeric(8, 1)),
        sa.Column("elevation_m", sa.Numeric(8, 1)),
        sa.Column("utm_zone", sa.SmallInteger()),
        # Resource
        sa.Column("tonnage_mt", sa.Numeric(12, 3)),
        sa.Column("tonnage_mt_low", sa.Numeric(12, 3)),
        sa.Column("tonnage_mt_high", sa.Numeric(12, 3)),
        sa.Column("tonnage_grade_pct", sa.Numeric(6, 3)),
        sa.Column("tonnage_cutoff_pct", sa.Numeric(6, 3)),
        sa.Column("tonnage_confidence", sa.String(50)),
        sa.Column("proven_mt", sa.Numeric(12, 3)),
        sa.Column("probable_mt", sa.Numeric(12, 3)),
        sa.Column("measured_mt", sa.Numeric(12, 3)),
        sa.Column("indicated_mt", sa.Numeric(12, 3)),
        sa.Column("inferred_mt", sa.Numeric(12, 3)),
        # Operational
        sa.Column("status", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("discovery_year", sa.SmallInteger()),
        sa.Column("production_start_year", sa.SmallInteger()),
        sa.Column("production_end_year", sa.SmallInteger()),
        sa.Column("operator_company", sa.String(300)),
        sa.Column("owner_companies", postgresql.ARRAY(sa.Text())),
        sa.Column("mining_method", sa.String(200)),
        # Geological context
        sa.Column("host_rock_age_min_id", postgresql.UUID(as_uuid=True)),
        sa.Column("host_rock_age_max_id", postgresql.UUID(as_uuid=True)),
        sa.Column("mineralization_age_min_id", postgresql.UUID(as_uuid=True)),
        sa.Column("mineralization_age_max_id", postgresql.UUID(as_uuid=True)),
        sa.Column("mineralization_age_method", sa.String(50)),
        sa.Column("mineralization_age_ma", sa.Numeric(7, 3)),
        sa.Column("mineralization_age_error_ma", sa.Numeric(5, 3)),
        sa.Column("host_rock_type", sa.String(300)),
        sa.Column("host_rock_age_text", sa.String(200)),
        sa.Column("tectonic_setting", sa.String(300)),
        sa.Column("geological_province", sa.String(300)),
        sa.Column("metallogenic_belt", sa.String(300)),
        # Description
        sa.Column("summary_en", sa.Text()),
        sa.Column("summary_zh", sa.Text()),
        sa.Column("geology_en", sa.Text()),
        sa.Column("geology_zh", sa.Text()),
        # Data provenance
        sa.Column("data_source", sa.String(500)),
        sa.Column("data_source_url", sa.Text()),
        sa.Column("reference_dois", postgresql.ARRAY(sa.Text())),
        sa.Column("last_verified_date", sa.Date()),
        sa.Column("data_quality_score", sa.SmallInteger()),
        # Media
        sa.Column("images", postgresql.ARRAY(sa.Text())),
        sa.Column("documents", postgresql.ARRAY(sa.Text())),
        # Extension
        sa.Column("properties", postgresql.JSONB(), server_default="{}"),
        # Metadata
        sa.Column("is_featured", sa.Boolean(), server_default="false"),
        sa.Column("is_public", sa.Boolean(), server_default="true"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("tags", postgresql.ARRAY(sa.Text())),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_by", sa.String(100)),
        sa.Column("updated_by", sa.String(100)),
    )
    # Critical spatial indexes
    op.create_index("idx_deposits_location", "deposits", ["location"], postgresql_using="gist")
    op.create_index("idx_deposits_location_approx", "deposits", ["location_approx"], postgresql_using="gist")
    # Query indexes
    op.create_index("idx_deposits_primary_mineral", "deposits", ["primary_mineral"])
    op.create_index("idx_deposits_status", "deposits", ["status"])
    op.create_index("idx_deposits_classification", "deposits", ["deposit_classification_id"])
    op.create_index("idx_deposits_country", "deposits", ["country_id"])
    op.create_index("idx_deposits_slug", "deposits", ["slug"])
    op.create_index("idx_deposits_tonnage", "deposits", ["tonnage_mt"], postgresql_where=sa.text("tonnage_mt IS NOT NULL"))
    op.create_index("idx_deposits_grade", "deposits", ["tonnage_grade_pct"], postgresql_where=sa.text("tonnage_grade_pct IS NOT NULL"))
    # Composite indexes
    op.create_index("idx_deposits_mineral_status", "deposits", ["primary_mineral", "status"])
    op.create_index("idx_deposits_country_mineral", "deposits", ["country_id", "primary_mineral"])
    # Full-text search
    op.create_index("idx_deposits_search_en", "deposits", [
        sa.text("to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary_en, ''))")
    ], postgresql_using="gin")

    # === Deposit Alteration ===
    op.create_table(
        "deposit_alteration",
        sa.Column("deposit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deposits.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("alteration_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("alteration_type.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("intensity", sa.SmallInteger()),
        sa.Column("spatial_extent", sa.String(100)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === Mineral Paragenesis ===
    op.create_table(
        "mineral_paragenesis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("deposit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mineral_name", sa.String(200), nullable=False),
        sa.Column("mineral_formula", sa.String(200)),
        sa.Column("stage", sa.String(50)),
        sa.Column("occurrence", sa.String(200)),
        sa.Column("relative_timing", sa.SmallInteger()),
        sa.Column("abundance", sa.String(50)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === Resource Estimates ===
    op.create_table(
        "resource_estimates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("deposit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mineral_code", sa.String(30), nullable=False),
        sa.Column("reporting_standard", sa.String(30), nullable=False),
        sa.Column("classification", sa.String(50), nullable=False),
        sa.Column("normalized_confidence", sa.String(20), nullable=False),
        sa.Column("tonnage_mt", sa.Numeric(12, 3), nullable=False),
        sa.Column("tonnage_ore_mt", sa.Numeric(12, 3)),
        sa.Column("grade_pct", sa.Numeric(6, 3)),
        sa.Column("cutoff_grade_pct", sa.Numeric(6, 3)),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("effective_date", sa.Date()),
        sa.Column("report_source", sa.String(300)),
        sa.Column("report_title", sa.String(500)),
        sa.Column("report_url", sa.Text()),
        sa.Column("report_doi", sa.Text()),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_by", sa.String(100)),
    )

    # === Production History ===
    op.create_table(
        "production_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("deposit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("ore_tonnes_mt", sa.Numeric(10, 3)),
        sa.Column("metal_tonnes", sa.Numeric(10, 3)),
        sa.Column("grade_pct", sa.Numeric(6, 3)),
        sa.Column("recovery_pct", sa.Numeric(5, 2)),
        sa.Column("source", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("deposit_id", "year"),
    )

    # === Provenance Tables ===
    op.create_table(
        "provenance_agent",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("agent_type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("orcid", sa.String(19), unique=True),
        sa.Column("ror_id", sa.String(20), unique=True),
        sa.Column("email", sa.String(200)),
        sa.Column("affiliation", sa.String(300)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "provenance_activity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("activity_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("software_used", sa.String(200)),
        sa.Column("software_version", sa.String(50)),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("input_entity_refs", postgresql.ARRAY(postgresql.UUID())),
        sa.Column("output_entity_refs", postgresql.ARRAY(postgresql.UUID())),
        sa.Column("parameters", postgresql.JSONB(), server_default="{}"),
        sa.Column("status", sa.String(20), server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "provenance_entity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("checksum", sa.String(64), nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("entity_type", "entity_id", "version"),
    )

    # === Dataset Release ===
    op.create_table(
        "dataset_release",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("version_tag", sa.String(20), unique=True, nullable=False),
        sa.Column("is_major", sa.Boolean(), server_default="false"),
        sa.Column("is_current", sa.Boolean(), server_default="false"),
        sa.Column("doi", sa.String(100)),
        sa.Column("doi_url", sa.Text()),
        sa.Column("zenodo_deposit_id", sa.Integer()),
        sa.Column("zenodo_concept_doi", sa.String(100)),
        sa.Column("release_date", sa.Date(), nullable=False),
        sa.Column("release_notes_en", sa.Text()),
        sa.Column("release_notes_zh", sa.Text()),
        sa.Column("record_count", sa.Integer(), nullable=False),
        sa.Column("copper_record_count", sa.Integer()),
        sa.Column("data_package_url", sa.Text()),
        sa.Column("quality_score_avg", sa.Numeric(3, 1)),
        sa.Column("verified_record_pct", sa.Numeric(4, 1)),
        sa.Column("with_tonnage_pct", sa.Numeric(4, 1)),
        sa.Column("with_grade_pct", sa.Numeric(4, 1)),
        sa.Column("with_age_pct", sa.Numeric(4, 1)),
        sa.Column("created_by", postgresql.UUID(as_uuid=True)),
        sa.Column("release_activity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("data_license", sa.String(100), server_default="CC-BY-4.0"),
        sa.Column("code_license", sa.String(100), server_default="MIT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === External Identifier ===
    op.create_table(
        "external_identifier",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("deposit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("identifier_type", sa.String(50), nullable=False),
        sa.Column("identifier", sa.String(300), nullable=False),
        sa.Column("identifier_url", sa.Text()),
        sa.Column("verified", sa.Boolean(), server_default="false"),
        sa.Column("verified_date", sa.Date()),
        sa.Column("verified_by", postgresql.UUID(as_uuid=True)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("deposit_id", "identifier_type"),
        sa.UniqueConstraint("identifier_type", "identifier"),
    )

    # === Mineral i18n ===
    op.create_table(
        "mineral_i18n",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("mineral_code", sa.String(30), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("chemical_symbol", sa.String(10)),
        sa.Column("group_name", sa.String(100)),
        sa.Column("color_hex", sa.String(7)),
        sa.Column("sort_order", sa.SmallInteger(), server_default="0"),
        sa.Column("is_enabled", sa.Boolean(), server_default="false"),
        sa.Column("phase", sa.SmallInteger(), server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("mineral_code", "language"),
    )

    # === Deposit Type i18n ===
    op.create_table(
        "deposit_type_i18n",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("classification_code", sa.String(50), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("classification_code", "language"),
    )

    # === Update trigger ===
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_deposits_updated_at
            BEFORE UPDATE ON deposits
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.execute("DROP TRIGGER IF EXISTS trg_deposits_updated_at ON deposits")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")

    op.drop_table("deposit_type_i18n")
    op.drop_table("mineral_i18n")
    op.drop_table("external_identifier")
    op.drop_table("dataset_release")
    op.drop_table("provenance_entity")
    op.drop_table("provenance_activity")
    op.drop_table("provenance_agent")
    op.drop_table("production_history")
    op.drop_table("resource_estimates")
    op.drop_table("mineral_paragenesis")
    op.drop_table("deposit_alteration")
    op.drop_table("deposits")
    op.drop_table("alteration_type")
    op.drop_table("geological_time_scale")
    op.drop_table("deposit_classification")
    op.drop_table("countries")
