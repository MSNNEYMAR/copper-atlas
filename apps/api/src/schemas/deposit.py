"""
Copper Atlas — Pydantic Schemas: Deposit
全局铜矿床图谱 — Pydantic 数据模式：矿床

Request/response schemas for the deposits API.
Uses GeoJSON Feature/FeatureCollection as the standard response format.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from geojson_pydantic import Feature, FeatureCollection, Point
from pydantic import BaseModel, Field


# ============================================================================
# Deposit Properties (GeoJSON Feature properties)
# ============================================================================

class DepositProperties(BaseModel):
    """Properties included in a GeoJSON Feature for a deposit."""

    name: str
    name_zh: Optional[str] = None
    slug: str
    primary_mineral: str = "copper"
    secondary_minerals: Optional[list[str]] = None
    deposit_type_code: Optional[str] = None
    deposit_type_name_en: Optional[str] = None
    deposit_type_name_zh: Optional[str] = None
    status: str = "unknown"
    country_iso: Optional[str] = None
    country_name_en: Optional[str] = None
    country_name_zh: Optional[str] = None
    state_province: Optional[str] = None
    tonnage_mt: Optional[float] = None
    tonnage_grade_pct: Optional[float] = None
    tonnage_confidence: Optional[str] = None
    discovery_year: Optional[int] = None
    operator_company: Optional[str] = None
    mining_method: Optional[str] = None
    host_rock_age_text: Optional[str] = None
    tectonic_setting: Optional[str] = None
    geological_province: Optional[str] = None
    data_quality_score: Optional[int] = None
    is_featured: bool = False
    data_source: Optional[str] = None

    model_config = {"extra": "allow"}


class DepositDetailProperties(DepositProperties):
    """Extended properties for single-deposit detail views."""

    alternative_names: Optional[list[str]] = None
    # Tonnage details
    tonnage_mt_low: Optional[float] = None
    tonnage_mt_high: Optional[float] = None
    tonnage_cutoff_pct: Optional[float] = None
    proven_mt: Optional[float] = None
    probable_mt: Optional[float] = None
    measured_mt: Optional[float] = None
    indicated_mt: Optional[float] = None
    inferred_mt: Optional[float] = None
    # Operational
    production_start_year: Optional[int] = None
    production_end_year: Optional[int] = None
    owner_companies: Optional[list[str]] = None
    # Geological
    mineralization_age_ma: Optional[float] = None
    mineralization_age_method: Optional[str] = None
    host_rock_type: Optional[str] = None
    metallogenic_belt: Optional[str] = None
    # Description
    summary_en: Optional[str] = None
    summary_zh: Optional[str] = None
    geology_en: Optional[str] = None
    geology_zh: Optional[str] = None
    # References
    reference_dois: Optional[list[str]] = None
    data_source_url: Optional[str] = None
    last_verified_date: Optional[date] = None
    # Media
    images: Optional[list[str]] = None
    documents: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    # Extension
    properties: Optional[dict[str, Any]] = None


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
    country: Optional[str] = Field(default=None, description="Comma-separated ISO country codes")
    deposit_type: Optional[str] = Field(default=None, description="Deposit classification code or ltree path")
    status: Optional[str] = Field(default=None, description="Comma-separated status values")
    min_tonnage: Optional[float] = Field(default=None, ge=0, description="Minimum tonnage (Mt)")
    max_tonnage: Optional[float] = Field(default=None, ge=0, description="Maximum tonnage (Mt)")
    min_grade: Optional[float] = Field(default=None, ge=0, description="Minimum grade (%)")
    max_grade: Optional[float] = Field(default=None, ge=0, description="Maximum grade (%)")
    bbox: Optional[str] = Field(
        default=None,
        description="Bounding box: minLon,minLat,maxLon,maxLat",
        pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$",
    )
    search: Optional[str] = Field(default=None, description="Full-text search query")
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=50, ge=1, le=200, description="Page size")
    sort: Optional[str] = Field(default=None, description="Sort field: tonnage_mt, grade_pct, name, discovery_year")
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
    total_tonnage_mt: Optional[float] = None
    avg_grade_pct: Optional[float] = None
    countries_count: int
    producing_count: int
    largest_deposit: Optional[dict[str, Any]] = None
    highest_grade_deposit: Optional[dict[str, Any]] = None


class StatsByCountry(BaseModel):
    """Statistics aggregated by country."""

    country_iso: str
    country_name_en: str
    country_name_zh: str
    deposit_count: int
    total_tonnage_mt: Optional[float] = None
    avg_grade_pct: Optional[float] = None


class StatsByType(BaseModel):
    """Statistics aggregated by deposit type."""

    deposit_type_code: str
    deposit_type_name_en: str
    deposit_type_name_zh: str
    count: int
    total_tonnage_mt: Optional[float] = None
    avg_grade_pct: Optional[float] = None


class StatsDistribution(BaseModel):
    """Histogram bucket for grade/tonnage distribution."""

    range_label: str
    range_min: float
    range_max: float
    count: int


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: dict[str, Any]
