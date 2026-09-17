"""
Copper Atlas — Deposits API Endpoints
全局铜矿床图谱 — 矿床 API 端点

RESTful endpoints for deposit queries:
  GET  /deposits                     — List with spatial + attribute filters
  GET  /deposits/{id}                — Single deposit detail
  GET  /deposits/slug/{slug}         — Single deposit by slug
  GET  /deposits/{id}/nearby         — Nearby deposits
  POST /transform                    — Coordinate transformation
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from ...dependencies import DepositSvc

router = APIRouter()


@router.get(
    "/deposits",
    summary="List deposits with spatial and attribute filters",
    description="""
    Query deposits with bounding-box spatial filter and optional attribute filters.

    Returns a GeoJSON FeatureCollection with pagination metadata.

    **Spatial Filter**: `bbox=minLon,minLat,maxLon,maxLat` in WGS84 (EPSG:4326).

    **Examples**:
    - All copper deposits: `GET /deposits`
    - Chile only: `GET /deposits?country=CL`
    - Porphyry type: `GET /deposits?deposit_type=por`
    - Chile + production: `GET /deposits?country=CL&status=production`
    - Large deposits in Andes: `GET /deposits?min_tonnage=10&bbox=-75,-35,-65,-15`
    """,
    tags=["Deposits"],
)
async def list_deposits(
    service: DepositSvc,
    mineral: str = Query(
        default="copper",
        description="Mineral type filter (e.g., 'copper', 'gold')",
    ),
    bbox: str | None = Query(
        default=None,
        description="Bounding box: minLon,minLat,maxLon,maxLat (WGS84)",
        pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$",
    ),
    country: str | None = Query(
        default=None,
        description="Comma-separated ISO country codes (e.g., 'CL,PE')",
    ),
    deposit_type: str | None = Query(
        default=None,
        description="Deposit classification ltree path (e.g., 'por' for all porphyry)",
    ),
    status: str | None = Query(
        default=None,
        description="Comma-separated status values (e.g., 'production,development')",
    ),
    min_tonnage: float | None = Query(default=None, ge=0, description="Minimum tonnage in Mt"),
    max_tonnage: float | None = Query(default=None, ge=0, description="Maximum tonnage in Mt"),
    min_grade: float | None = Query(default=None, ge=0, description="Minimum grade in %"),
    max_grade: float | None = Query(default=None, ge=0, description="Maximum grade in %"),
    search: str | None = Query(default=None, description="Full-text search query"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(default=50, ge=1, le=200, description="Page size (max 200)"),
    sort: str = Query(default="tonnage_mt", description="Sort field"),
    order: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order"),
) -> dict:
    return await service.list_deposits(
        mineral=mineral,
        bbox=bbox,
        country=country,
        deposit_type=deposit_type,
        status=status,
        min_tonnage=min_tonnage,
        max_tonnage=max_tonnage,
        min_grade=min_grade,
        max_grade=max_grade,
        search=search,
        page=page,
        size=size,
        sort=sort,
        order=order,
    )


@router.get(
    "/deposits/{deposit_id}",
    summary="Get a single deposit by UUID",
    description="Returns full deposit detail as a GeoJSON Feature.",
    tags=["Deposits"],
)
async def get_deposit(
    deposit_id: UUID,
    service: DepositSvc,
) -> dict:
    return await service.get_deposit(deposit_id)


@router.get(
    "/deposits/slug/{slug}",
    summary="Get a single deposit by slug",
    description="Returns full deposit detail by its URL-friendly slug identifier.",
    tags=["Deposits"],
)
async def get_deposit_by_slug(
    slug: str,
    service: DepositSvc,
) -> dict:
    return await service.get_deposit_by_slug(slug)


@router.get(
    "/deposits/{deposit_id}/nearby",
    summary="Find deposits near a given deposit",
    description="Returns deposits within a specified radius of the center deposit.",
    tags=["Deposits"],
)
async def get_nearby_deposits(
    deposit_id: UUID,
    service: DepositSvc,
    radius_km: float = Query(default=50.0, ge=0.1, le=500.0, description="Search radius in km"),
    mineral: str | None = Query(default=None, description="Filter nearby by mineral type"),
    limit: int = Query(default=10, ge=1, le=50, description="Maximum number of results"),
) -> dict:
    return await service.get_nearby(
        deposit_id=deposit_id,
        radius_km=radius_km,
        mineral=mineral,
        limit=limit,
    )
