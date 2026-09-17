"""
Copper Atlas — FastAPI Dependencies
全局铜矿床图谱 — FastAPI 依赖注入

Reusable dependency functions for FastAPI endpoints.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_session
from .services.deposit_service import DepositService

# Database session dependency
DBSession = Annotated[AsyncSession, Depends(get_session)]


async def get_deposit_service(session: DBSession) -> DepositService:
    """Provide a DepositService instance with an active DB session."""
    return DepositService(session)


DepositSvc = Annotated[DepositService, Depends(get_deposit_service)]
