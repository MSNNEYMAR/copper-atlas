"""
Copper Atlas — Statistics API Endpoints
全局铜矿床图谱 — 统计 API 端点

Aggregated statistics for dashboards and charts:
  GET /statistics/summary              — KPI overview
  GET /statistics/by-country            — By country
  GET /statistics/by-type               — By deposit type
  GET /statistics/by-status             — By operational status
  GET /statistics/tonnage-distribution  — Tonnage histogram
  GET /statistics/grade-distribution    — Grade histogram
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from ...dependencies import DepositSvc

router = APIRouter()


@router.get(
    "/statistics/summary",
    summary="Get summary statistics",
    description="Key performance indicators: total deposits, total tonnage, average grade, and more.",
    tags=["Statistics"],
)
async def get_summary(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
) -> dict:
    return await service.get_summary(mineral=mineral)


@router.get(
    "/statistics/by-country",
    summary="Statistics by country",
    description="Deposit count and total tonnage aggregated by country.",
    tags=["Statistics"],
)
async def get_by_country(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
    top_n: int = Query(default=20, ge=1, le=100, description="Number of top countries to return"),
) -> list[dict]:
    return await service.get_by_country(mineral=mineral, top_n=top_n)


@router.get(
    "/statistics/by-type",
    summary="Statistics by deposit type",
    description="Deposit count and average grade aggregated by top-level deposit classification.",
    tags=["Statistics"],
)
async def get_by_type(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
) -> list[dict]:
    return await service.get_by_type(mineral=mineral)


@router.get(
    "/statistics/by-status",
    summary="Statistics by operational status",
    description="Deposit count and total tonnage aggregated by operational status.",
    tags=["Statistics"],
)
async def get_by_status(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
) -> list[dict]:
    return await service.get_by_status(mineral=mineral)


@router.get(
    "/statistics/tonnage-distribution",
    summary="Tonnage distribution histogram",
    description="Histogram data for deposit tonnage distribution, suitable for bar charts.",
    tags=["Statistics"],
)
async def get_tonnage_distribution(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
    buckets: int = Query(default=20, ge=5, le=100, description="Number of histogram buckets"),
) -> list[dict]:
    return await service.get_tonnage_distribution(mineral=mineral, buckets=buckets)


@router.get(
    "/statistics/grade-distribution",
    summary="Grade distribution histogram",
    description="Histogram data for deposit grade distribution, suitable for bar charts.",
    tags=["Statistics"],
)
async def get_grade_distribution(
    service: DepositSvc,
    mineral: str = Query(default="copper", description="Mineral type"),
    buckets: int = Query(default=20, ge=5, le=100, description="Number of histogram buckets"),
) -> list[dict]:
    return await service.get_grade_distribution(mineral=mineral, buckets=buckets)
