"""
Copper Atlas — Database Configuration
全局铜矿床图谱 — 数据库配置

Async SQLAlchemy engine with GeoAlchemy2 for PostGIS spatial support.
Uses asyncpg as the underlying PostgreSQL driver for maximum performance.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from geoalchemy2 import Geometry  # noqa: F401 — imported for model usage
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()

# Async engine for FastAPI
engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_pre_ping=True,  # Verify connections before using them
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevent expired object errors in async context
)


# Enable PostGIS extension on connect
@event.listens_for(engine.sync_engine, "connect")
def enable_postgis(dbapi_connection, connection_record):
    """Enable PostGIS for each new connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO public, postgis")
    cursor.close()


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""

    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: provide an async database session.

    Usage:
        @router.get("/deposits")
        async def get_deposits(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_database_connection() -> bool:
    """Health check: verify the database is reachable."""
    try:
        async with engine.connect() as conn:
            await conn.execute(
                # Verify PostGIS is installed
                __import__("sqlalchemy").text(
                    "SELECT PostGIS_Version()"
                )
            )
        return True
    except Exception:
        return False
