"""
Copper Atlas — Deposit Model
全局铜矿床图谱 — 矿床数据模型

The central model of the entire platform. Mineral-agnostic design:
primary_mineral is a string reference, not a fixed enum column.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Country(Base):
    """ISO 3166 country reference with spatial boundary."""

    __tablename__ = "countries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iso_code: Mapped[str] = mapped_column(String(2), unique=True, nullable=False, index=True)
    iso_code_3: Mapped[str] = mapped_column(String(3), unique=True, nullable=False)
    iso_numeric: Mapped[Optional[int]] = mapped_column(SmallInteger)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), nullable=False)
    continent: Mapped[Optional[str]] = mapped_column(String(20))
    subregion: Mapped[Optional[str]] = mapped_column(String(50))
    geom: Mapped[Optional[Geometry]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=True)
    )
    centroid: Mapped[Optional[Geometry]] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=True)
    )
    mineral_rank_copper: Mapped[Optional[int]] = mapped_column(SmallInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Relationships
    deposits: Mapped[list["Deposit"]] = relationship(back_populates="country", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Country {self.iso_code} — {self.name_en}>"


class DepositClassification(Base):
    """Hierarchical mineral deposit classification using ltree."""

    __tablename__ = "deposit_classification"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    path: Mapped[str] = mapped_column(String, nullable=False)  # ltree type
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(200), nullable=False)
    parent_code: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("deposit_classification.code"), index=True
    )
    depth: Mapped[int] = mapped_column(SmallInteger, default=1)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    description_zh: Mapped[Optional[str]] = mapped_column(Text)
    typical_grade_range: Mapped[Optional[str]] = mapped_column(String)  # NUMRANGE
    typical_tonnage_range: Mapped[Optional[str]] = mapped_column(String)  # NUMRANGE
    tectonic_setting: Mapped[Optional[str]] = mapped_column(String(300))
    associated_rocks: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    associated_alteration: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    key_references: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    # Relationships
    deposits: Mapped[list["Deposit"]] = relationship(back_populates="classification", lazy="selectin")

    __table_args__ = (
        Index("idx_classification_path_gist", "path", postgresql_using="gist"),
    )

    def __repr__(self) -> str:
        return f"<DepositClassification {self.code} — {self.name_en}>"


class GeologicalTimeScale(Base):
    """ICS International Chronostratigraphic Chart."""

    __tablename__ = "geological_time_scale"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), nullable=False)
    rank_en: Mapped[str] = mapped_column(String(50), nullable=False)
    rank_zh: Mapped[str] = mapped_column(String(50), nullable=False)
    base_age_ma: Mapped[float] = mapped_column(Numeric(8, 3), nullable=False)
    top_age_ma: Mapped[float] = mapped_column(Numeric(8, 3), nullable=False)
    age_uncertainty_ma: Mapped[Optional[float]] = mapped_column(Numeric(5, 3))
    path: Mapped[str] = mapped_column(String, nullable=False)  # ltree
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geological_time_scale.id"), index=True
    )
    gssp_location: Mapped[Optional[str]] = mapped_column(String(500))
    gssp_latitude: Mapped[Optional[float]] = mapped_column(Numeric)
    gssp_longitude: Mapped[Optional[float]] = mapped_column(Numeric)
    color_hex: Mapped[Optional[str]] = mapped_column(String(7))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("idx_geotime_path_gist", "path", postgresql_using="gist"),
        UniqueConstraint("name_en", "rank_en"),
    )


class Deposit(Base):
    """Central deposit entity — mineral-agnostic, spatially-enabled."""

    __tablename__ = "deposits"

    # === IDENTIFICATION ===
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(300), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    name_zh: Mapped[Optional[str]] = mapped_column(String(500))
    alternative_names: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))

    # === MINERAL CLASSIFICATION ===
    primary_mineral: Mapped[str] = mapped_column(String(30), nullable=False, default="copper", index=True)
    secondary_minerals: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    deposit_classification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deposit_classification.id"), nullable=False, index=True
    )

    # === LOCATION ===
    country_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False, index=True
    )
    state_province: Mapped[Optional[str]] = mapped_column(String(200))
    location: Mapped[Geometry] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=True), nullable=False
    )
    location_approx: Mapped[Optional[Geometry]] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=True)
    )
    location_source: Mapped[Optional[Geometry]] = mapped_column(Geometry("POINT"))
    source_srid: Mapped[int] = mapped_column(Integer, default=4326)
    location_precision_m: Mapped[Optional[float]] = mapped_column(Numeric(8, 1))
    elevation_m: Mapped[Optional[float]] = mapped_column(Numeric(8, 1))

    # === RESOURCE ESTIMATES ===
    tonnage_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    tonnage_mt_low: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    tonnage_mt_high: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    tonnage_grade_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    tonnage_cutoff_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    tonnage_confidence: Mapped[Optional[str]] = mapped_column(String(50))
    proven_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    probable_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    measured_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    indicated_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    inferred_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))

    # === OPERATIONAL ===
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)
    discovery_year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    production_start_year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    production_end_year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    operator_company: Mapped[Optional[str]] = mapped_column(String(300))
    owner_companies: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    mining_method: Mapped[Optional[str]] = mapped_column(String(200))

    # === GEOLOGICAL CONTEXT ===
    host_rock_age_min_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geological_time_scale.id"), index=True
    )
    host_rock_age_max_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geological_time_scale.id"), index=True
    )
    mineralization_age_min_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geological_time_scale.id"), index=True
    )
    mineralization_age_max_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geological_time_scale.id"), index=True
    )
    mineralization_age_method: Mapped[Optional[str]] = mapped_column(String(50))
    mineralization_age_ma: Mapped[Optional[float]] = mapped_column(Numeric(7, 3))
    mineralization_age_error_ma: Mapped[Optional[float]] = mapped_column(Numeric(5, 3))
    host_rock_type: Mapped[Optional[str]] = mapped_column(String(300))
    host_rock_age_text: Mapped[Optional[str]] = mapped_column(String(200))
    tectonic_setting: Mapped[Optional[str]] = mapped_column(String(300))
    geological_province: Mapped[Optional[str]] = mapped_column(String(300))
    metallogenic_belt: Mapped[Optional[str]] = mapped_column(String(300))

    # === DESCRIPTION ===
    summary_en: Mapped[Optional[str]] = mapped_column(Text)
    summary_zh: Mapped[Optional[str]] = mapped_column(Text)
    geology_en: Mapped[Optional[str]] = mapped_column(Text)
    geology_zh: Mapped[Optional[str]] = mapped_column(Text)

    # === PROVENANCE ===
    data_source: Mapped[Optional[str]] = mapped_column(String(500))
    data_source_url: Mapped[Optional[str]] = mapped_column(Text)
    reference_dois: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    last_verified_date: Mapped[Optional[date]] = mapped_column(Date)
    data_quality_score: Mapped[Optional[int]] = mapped_column(SmallInteger)

    # === MEDIA ===
    images: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    documents: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))

    # === EXTENSIBLE PROPERTIES ===
    properties: Mapped[dict] = mapped_column(JSONB, default=dict)

    # === METADATA ===
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )
    created_by: Mapped[Optional[str]] = mapped_column(String(100))
    updated_by: Mapped[Optional[str]] = mapped_column(String(100))

    # === RELATIONSHIPS ===
    country: Mapped["Country"] = relationship(back_populates="deposits", lazy="selectin")
    classification: Mapped["DepositClassification"] = relationship(
        back_populates="deposits", lazy="selectin"
    )
    host_rock_age_min: Mapped[Optional["GeologicalTimeScale"]] = relationship(
        foreign_keys=[host_rock_age_min_id], lazy="selectin"
    )
    host_rock_age_max: Mapped[Optional["GeologicalTimeScale"]] = relationship(
        foreign_keys=[host_rock_age_max_id], lazy="selectin"
    )
    mineralization_age_min: Mapped[Optional["GeologicalTimeScale"]] = relationship(
        foreign_keys=[mineralization_age_min_id], lazy="selectin"
    )
    mineralization_age_max: Mapped[Optional["GeologicalTimeScale"]] = relationship(
        foreign_keys=[mineralization_age_max_id], lazy="selectin"
    )
    alterations: Mapped[list["DepositAlteration"]] = relationship(back_populates="deposit", lazy="selectin")
    paragenesis: Mapped[list["MineralParagenesis"]] = relationship(back_populates="deposit", lazy="selectin")
    resource_estimates: Mapped[list["ResourceEstimate"]] = relationship(back_populates="deposit", lazy="selectin")
    production_history: Mapped[list["ProductionHistory"]] = relationship(back_populates="deposit", lazy="selectin")

    __table_args__ = (
        CheckConstraint("data_quality_score BETWEEN 1 AND 5", name="ck_data_quality_score"),
        Index("idx_deposits_location_gist", "location", postgresql_using="gist"),
        Index("idx_deposits_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
        Index("idx_deposits_tags_gin", "tags", postgresql_using="gin"),
        Index("idx_deposits_properties_gin", "properties", postgresql_using="gin", postgresql_ops={"properties": "jsonb_path_ops"}),
    )

    def __repr__(self) -> str:
        return f"<Deposit {self.slug} — {self.name} ({self.primary_mineral})>"


class AlterationType(Base):
    """Hydrothermal alteration classification."""

    __tablename__ = "alteration_type"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    name_zh: Mapped[str] = mapped_column(String(100), nullable=False)
    description_en: Mapped[Optional[str]] = mapped_column(Text)
    description_zh: Mapped[Optional[str]] = mapped_column(Text)
    typical_minerals: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    typical_zone: Mapped[Optional[str]] = mapped_column(String(50))
    associated_deposit_types: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text))
    temperature_range: Mapped[Optional[str]] = mapped_column(String)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())


class DepositAlteration(Base):
    """Junction: deposit ↔ alteration type."""

    __tablename__ = "deposit_alteration"

    deposit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deposits.id", ondelete="CASCADE"), primary_key=True
    )
    alteration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alteration_type.id", ondelete="CASCADE"), primary_key=True
    )
    intensity: Mapped[Optional[int]] = mapped_column(SmallInteger)
    spatial_extent: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    deposit: Mapped["Deposit"] = relationship(back_populates="alterations")
    alteration: Mapped["AlterationType"] = relationship()


class MineralParagenesis(Base):
    """Mineral paragenetic sequence per deposit."""

    __tablename__ = "mineral_paragenesis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deposit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mineral_name: Mapped[str] = mapped_column(String(200), nullable=False)
    mineral_formula: Mapped[Optional[str]] = mapped_column(String(200))
    stage: Mapped[Optional[str]] = mapped_column(String(50))
    occurrence: Mapped[Optional[str]] = mapped_column(String(200))
    relative_timing: Mapped[Optional[int]] = mapped_column(SmallInteger)
    abundance: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    deposit: Mapped["Deposit"] = relationship(back_populates="paragenesis")


class ResourceEstimate(Base):
    """Versioned resource estimates with reporting standards."""

    __tablename__ = "resource_estimates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deposit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mineral_code: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    reporting_standard: Mapped[str] = mapped_column(String(30), nullable=False)
    classification: Mapped[str] = mapped_column(String(50), nullable=False)
    normalized_confidence: Mapped[str] = mapped_column(String(20), nullable=False)
    tonnage_mt: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    tonnage_ore_mt: Mapped[Optional[float]] = mapped_column(Numeric(12, 3))
    grade_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    cutoff_grade_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date)
    report_source: Mapped[Optional[str]] = mapped_column(String(300))
    report_title: Mapped[Optional[str]] = mapped_column(String(500))
    report_url: Mapped[Optional[str]] = mapped_column(Text)
    report_doi: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    created_by: Mapped[Optional[str]] = mapped_column(String(100))

    deposit: Mapped["Deposit"] = relationship(back_populates="resource_estimates")


class ProductionHistory(Base):
    """Annual production records."""

    __tablename__ = "production_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deposit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deposits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(SmallInteger, nullable=False, index=True)
    ore_tonnes_mt: Mapped[Optional[float]] = mapped_column(Numeric(10, 3))
    metal_tonnes: Mapped[Optional[float]] = mapped_column(Numeric(10, 3))
    grade_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    recovery_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    source: Mapped[Optional[str]] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    deposit: Mapped["Deposit"] = relationship(back_populates="production_history")

    __table_args__ = (
        UniqueConstraint("deposit_id", "year"),
    )
