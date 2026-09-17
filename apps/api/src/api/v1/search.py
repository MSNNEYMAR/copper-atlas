"""
Copper Atlas — Search API Endpoints
全局铜矿床图谱 — 搜索 API 端点

Full-text and prefix search:
  GET /search            — Full-text search across deposits
  GET /search/autocomplete — Prefix autocomplete for deposit names
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from ...dependencies import DepositSvc

router = APIRouter()


@router.get(
    "/search",
    summary="Full-text search",
    description="Search deposits by name, description, and alternative names using PostgreSQL full-text search.",
    tags=["Search"],
)
async def search_deposits(
    service: DepositSvc,
    q: str = Query(..., min_length=2, description="Search query string"),
    mineral: str = Query(default="copper", description="Mineral type filter"),
    language: str = Query(default="en", pattern="^(en|zh)$", description="Search language"),
    limit: int = Query(default=10, ge=1, le=50, description="Maximum results"),
) -> list[dict]:
    return await service.search(query=q, mineral=mineral, language=language, limit=limit)


@router.get(
    "/search/autocomplete",
    summary="Autocomplete deposit names",
    description="Prefix-based autocomplete for quick deposit name lookup. Uses trigram matching.",
    tags=["Search"],
)
async def autocomplete_deposits(
    service: DepositSvc,
    q: str = Query(..., min_length=1, description="Prefix string to autocomplete"),
    mineral: str = Query(default="copper", description="Mineral type filter"),
    limit: int = Query(default=5, ge=1, le=20, description="Maximum suggestions"),
) -> list[dict]:
    return await service.autocomplete(prefix=q, mineral=mineral, limit=limit)
