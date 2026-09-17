"""
Copper Atlas — API v1 Router
全局铜矿床图谱 — API v1 路由聚合

Central router that aggregates all v1 endpoint modules.
"""

from fastapi import APIRouter

from .deposits import router as deposits_router
from .reference import router as reference_router
from .search import router as search_router
from .statistics import router as statistics_router

api_router = APIRouter()

# Register all sub-routers
api_router.include_router(deposits_router)
api_router.include_router(statistics_router)
api_router.include_router(search_router)
api_router.include_router(reference_router)

__all__ = ["api_router"]
