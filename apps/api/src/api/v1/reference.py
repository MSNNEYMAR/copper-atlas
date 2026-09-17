"""
Copper Atlas — Reference Data API Endpoints
全局铜矿床图谱 — 参考数据 API 端点

Read-only endpoints for lookup/reference data:
  GET /minerals        — Available mineral types
  GET /countries       — Countries with deposit counts
  GET /deposit-types   — Deposit classification hierarchy
  GET /time-scale      — Geological time scale
  POST /transform      — Coordinate transformation
"""

from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from ...dependencies import DBSession, DepositSvc
from ...models.deposit import Country, Deposit, DepositClassification

router = APIRouter()


@router.get(
    "/minerals",
    summary="List available mineral types",
    description="Returns all registered mineral types with display names and chemical symbols.",
    tags=["Reference"],
)
async def list_minerals(session: DBSession) -> list[dict]:
    query = select(
        func.distinct(Deposit.primary_mineral).label("mineral_code"),
    ).where(Deposit.is_active.is_(True))

    result = await session.execute(query)
    minerals = [r.mineral_code for r in result.all()]

    # Mineral metadata registry (hardcoded for now, DB-backed in Phase 2)
    mineral_meta = {
        "copper": {"chemical_symbol": "Cu", "enabled": True, "phase": 1},
        "gold": {"chemical_symbol": "Au", "enabled": False, "phase": 2},
        "iron": {"chemical_symbol": "Fe", "enabled": False, "phase": 2},
        "lithium": {"chemical_symbol": "Li", "enabled": False, "phase": 2},
    }

    return [
        {
            "mineral_code": m,
            "chemical_symbol": mineral_meta.get(m, {}).get("chemical_symbol", ""),
            "enabled": mineral_meta.get(m, {}).get("enabled", True),
            "phase": mineral_meta.get(m, {}).get("phase", 1),
        }
        for m in minerals
    ]


@router.get(
    "/countries",
    summary="List countries with deposit counts",
    description="Returns all countries that have deposits, with count and total tonnage.",
    tags=["Reference"],
)
async def list_countries(
    session: DBSession,
    mineral: str = Query(default="copper", description="Mineral type filter"),
) -> list[dict]:
    query = (
        select(
            Country.iso_code,
            Country.iso_code_3,
            Country.name_en,
            Country.name_zh,
            Country.continent,
            func.count(Deposit.id).label("deposit_count"),
            func.sum(Deposit.tonnage_mt).label("total_tonnage"),
        )
        .join(Deposit, Deposit.country_id == Country.id)
        .where(Deposit.primary_mineral == mineral)
        .where(Deposit.is_active.is_(True))
        .group_by(Country.iso_code, Country.iso_code_3, Country.name_en, Country.name_zh, Country.continent)
        .order_by(func.count(Deposit.id).desc())
    )

    result = await session.execute(query)
    return [
        {
            "iso_code": r.iso_code,
            "iso_code_3": r.iso_code_3,
            "name_en": r.name_en,
            "name_zh": r.name_zh,
            "continent": r.continent,
            "deposit_count": r.deposit_count,
            "total_tonnage_mt": float(r.total_tonnage) if r.total_tonnage else None,
        }
        for r in result.all()
    ]


@router.get(
    "/deposit-types",
    summary="List deposit classification hierarchy",
    description="Returns the full hierarchical deposit classification with ltree paths.",
    tags=["Reference"],
)
async def list_deposit_types(session: DBSession) -> list[dict]:
    query = (
        select(DepositClassification)
        .where(DepositClassification.is_active.is_(True))
        .order_by(DepositClassification.sort_order, DepositClassification.depth)
    )

    result = await session.execute(query)
    types = result.scalars().all()

    return [
        {
            "code": t.code,
            "path": str(t.path),
            "name_en": t.name_en,
            "name_zh": t.name_zh,
            "parent_code": t.parent_code,
            "depth": t.depth,
            "description_en": t.description_en,
            "tectonic_setting": t.tectonic_setting,
            "sort_order": t.sort_order,
        }
        for t in types
    ]


@router.get(
    "/time-scale",
    summary="List geological time scale",
    description="Returns the ICS 2024 International Chronostratigraphic Chart.",
    tags=["Reference"],
)
async def list_time_scale(session: DBSession) -> list[dict]:
    from ...models.deposit import GeologicalTimeScale

    query = (
        select(GeologicalTimeScale)
        .where(GeologicalTimeScale.is_active.is_(True))
        .order_by(GeologicalTimeScale.sort_order, GeologicalTimeScale.base_age_ma.desc())
    )

    result = await session.execute(query)
    units = result.scalars().all()

    return [
        {
            "id": str(u.id),
            "name_en": u.name_en,
            "name_zh": u.name_zh,
            "rank_en": u.rank_en,
            "rank_zh": u.rank_zh,
            "base_age_ma": float(u.base_age_ma),
            "top_age_ma": float(u.top_age_ma),
            "path": str(u.path),
            "color_hex": u.color_hex,
        }
        for u in units
    ]


@router.get(
    "/statuses",
    summary="List deposit status values",
    description="Returns all valid deposit operational status values.",
    tags=["Reference"],
)
async def list_statuses() -> list[dict]:
    statuses = [
        {"value": "exploration", "label_en": "Exploration", "label_zh": "勘探"},
        {"value": "feasibility", "label_en": "Feasibility", "label_zh": "可行性研究"},
        {"value": "development", "label_en": "Development", "label_zh": "开发建设"},
        {"value": "production", "label_en": "Production", "label_zh": "生产中"},
        {"value": "suspended", "label_en": "Suspended", "label_zh": "暂停"},
        {"value": "closed", "label_en": "Closed", "label_zh": "已关闭"},
        {"value": "depleted", "label_en": "Depleted", "label_zh": "已采尽"},
        {"value": "unknown", "label_en": "Unknown", "label_zh": "未知"},
    ]
    return statuses


@router.post(
    "/transform",
    summary="Transform coordinates between spatial reference systems",
    description="Convert coordinates from one EPSG SRID to another using pyproj.",
    tags=["Reference"],
)
async def transform_coordinates(
    service: DepositSvc,
    longitude: float = Query(..., description="X coordinate / longitude"),
    latitude: float = Query(..., description="Y coordinate / latitude"),
    from_srid: int = Query(default=4326, description="Source EPSG code"),
    to_srid: int = Query(default=3857, description="Target EPSG code"),
) -> dict:
    return service.transform_coordinates(
        longitude=longitude,
        latitude=latitude,
        from_srid=from_srid,
        to_srid=to_srid,
    )
