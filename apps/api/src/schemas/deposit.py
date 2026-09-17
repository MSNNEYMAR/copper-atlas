"""
Copper Atlas — Pydantic Schemas: Deposit
全局铜矿床图谱 — Pydantic 数据模式：矿床

Request/response schemas for the deposits API.
Uses GeoJSON Feature/FeatureCollection as the standard response format.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from geojson_pydantic import Feature, FeatureCollection, Point
from pydantic import BaseModel, Field

# ============================================================================
# Deposit Properties (GeoJSON Feature properties)
# ============================================================================

class DepositProperties(BaseModel):
    """Properties included in a GeoJSON Feature for a deposit."""

    name: str
    name_zh: str | None = None
    slug: str
    primary_mineral: str = "copper"
    secondary_minerals: list[str] | None = None
    deposit_type_code: str | None = None
    deposit_type_name_en: str | None = None
    deposit_type_name_zh: str | None = None
    status: str = "unknown"
    country_iso: str | None = None
    country_name_en: str | None = None
    country_name_zh: str | None = None
    state_province: str | None = None
    tonnage_mt: float | None = None
    tonnage_grade_pct: float | None = None
    tonnage_confidence: str | None = None
    discovery_year: int | None = None
    operator_company: str | None = None
    mining_method: str | None = None
    host_rock_age_text: str | None = None
    tectonic_setting: str | None = None
    geological_province: str | None = None
    data_quality_score: int | None = None
    is_featured: bool = False
    data_source: str | None = None

    model_config = {"extra": "allow"}


class DepositDetailProperties(DepositProperties):
    """Extended properties for single-deposit detail views."""

    alternative_names: list[str] | None = None
    # Tonnage details
    tonnage_mt_low: float | None = None
    tonnage_mt_high: float | None = None
    tonnage_cutoff_pct: float | None = None
    proven_mt: float | None = None
    probable_mt: float | None = None
    measured_mt: float | None = None
    indicated_mt: float | None = None
    inferred_mt: float | None = None
    # Operational
    production_start_year: int | None = None
    production_end_year: int | None = None
    owner_companies: list[str] | None = None
    # Geological
    mineralization_age_ma: float | None = None
    mineralization_age_method: str | None = None
    host_rock_type: str | None = None
    metallogenic_belt: str | None = None
    # Description
    summary_en: str | None = None
    summary_zh: str | None = None
    geology_en: str | None = None
    geology_zh: str | None = None
    # References
    reference_dois: list[str] | None = None
    data_source_url: str | None = None
    last_verified_date: date | None = None
    # Media
    images: list[str] | None = None
    documents: list[str] | None = None
    tags: list[str] | None = None
    # Extension
    properties: dict[str, Any] | None = None


# ============================================================================
# GeoJSON Types
# ============================================================================

DepositFeature = Feature[Point, DepositProperties]
DepositFeatureCollection = FeatureCollection[Point, DepositProperties]
DepositDetailFeature = Feature[Point, DepositDetailProperties]


# ============================================================================
# API Request/Response Schemas
# ============================================================================

class DepositListParams(BaseModel):
    """Query parameters for listing deposits."""

    mineral: str = Field(default="copper", description="Mineral type filter")
    country: str | None = Field(default=None, description="Comma-separated ISO country codes")
    deposit_type: str | None = Field(default=None, description="Deposit classification code or ltree path")
    status: str | None = Field(default=None, description="Comma-separated status values")
    min_tonnage: float | None = Field(default=None, ge=0, description="Minimum tonnage (Mt)")
    max_tonnage: float | None = Field(default=None, ge=0, description="Maximum tonnage (Mt)")
    min_grade: float | None = Field(default=None, ge=0, description="Minimum grade (%)")
    max_grade: float | None = Field(default=None, ge=0, description="Maximum grade (%)")
    bbox: str | None = Field(
        default=None,
        description="Bounding box: minLon,minLat,maxLon,maxLat",
        pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$",
    )
    search: str | None = Field(default=None, description="Full-text search query")
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=50, ge=1, le=200, description="Page size")
    sort: str | None = Field(default=None, description="Sort field: tonnage_mt, grade_pct, name, discovery_year")
    order: str = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    total: int
    page: int
    size: int
    pages: int


class DepositListResponse(BaseModel):
    """GeoJSON FeatureCollection with pagination metadata."""

    type: str = "FeatureCollection"
    features: list[dict[str, Any]]  # GeoJSON Feature objects
    meta: PaginationMeta


class NearbyParams(BaseModel):
    """Query parameters for finding nearby deposits."""

    radius_km: float = Field(default=50.0, ge=0.1, le=500.0, description="Search radius in km")
    mineral: str = Field(default="copper", description="Mineral type filter")
    limit: int = Field(default=10, ge=1, le=50, description="Max results")


# ============================================================================
# Statistics Schemas
# ============================================================================

class StatsSummary(BaseModel):
    """Summary statistics for a mineral type."""

    total_deposits: int
    total_tonnage_mt: float | None = None
    avg_grade_pct: float | None = None
    countries_count: int
    producing_count: int
    largest_deposit: dict[str, Any] | None = None
    highest_grade_deposit: dict[str, Any] | None = None


class StatsByCountry(BaseModel):
    """Statistics aggregated by country."""

    country_iso: str
    country_name_en: str
    country_name_zh: str
    deposit_count: int
    total_tonnage_mt: float | None = None
    avg_grade_pct: float | None = None


class StatsByType(BaseModel):
    """Statistics aggregated by deposit type."""

    deposit_type_code: str
    deposit_type_name_en: str
    deposit_type_name_zh: str
    count: int
    total_tonnage_mt: float | None = None
    avg_grade_pct: float | None = None


class StatsDistribution(BaseModel):
    """Histogram bucket for grade/tonnage distribution."""

    range_label: str
    range_min: float
    range_max: float
    count: int


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: dict[str, Any]
