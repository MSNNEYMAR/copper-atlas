"""
Copper Atlas — Pytest Configuration and Fixtures
全局铜矿床图谱 — 测试配置与 Fixtures

Provides:
  - Async database session with transaction rollback (test isolation)
  - FastAPI async test client (httpx AsyncClient)
  - Test data fixtures (countries, classification, deposits)
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Use a test database (defaults to copper_atlas_test)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://atlas:atlas_dev@localhost:5432/copper_atlas_test",
)

# Create async engine for test database
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=5,
)
TestSessionFactory = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a test database session with automatic rollback.

    Each test gets a clean session. Transactions are rolled back
    after each test, ensuring no cross-test data pollution.
    """
    async with TestSessionFactory() as session, session.begin():
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP test client connected to the FastAPI app.

    Uses ASGI transport for direct app communication (no network).
    Database sessions use the test database.
    """
    from src.database import get_session
    from src.main import app

    async def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_country(session: AsyncSession) -> str:
    """Create a test country and return its ID."""
    result = await session.execute(
        text("""
            INSERT INTO countries (id, iso_code, iso_code_3, name_en, name_zh, continent, centroid)
            VALUES (gen_random_uuid(), 'TS', 'TST', 'Testland', '测试国', 'Test Continent',
                    ST_SetSRID(ST_MakePoint(0, 0), 4326))
            RETURNING id
        """)
    )
    return str(result.scalar_one())


@pytest_asyncio.fixture
async def test_classification(session: AsyncSession) -> str:
    """Create a test deposit classification and return its ID."""
    result = await session.execute(
        text("""
            INSERT INTO deposit_classification (id, code, path, name_en, name_zh, depth)
            VALUES (gen_random_uuid(), 'TEST_TYPE', 'test', 'Test Type', '测试类型', 1)
            RETURNING id
        """)
    )
    return str(result.scalar_one())


@pytest_asyncio.fixture
async def test_deposit(
    session: AsyncSession,
    test_country: str,
    test_classification: str,
) -> str:
    """Create a test deposit and return its ID."""
    result = await session.execute(
        text("""
            INSERT INTO deposits (
                id, slug, name, primary_mineral, deposit_classification_id,
                country_id, location, status, tonnage_mt, tonnage_grade_pct,
                is_featured, is_public, is_active
            )
            VALUES (
                gen_random_uuid(), 'test-deposit', 'Test Deposit', 'copper',
                :classification_id, :country_id,
                ST_SetSRID(ST_MakePoint(10.0, 20.0), 4326),
                'production', 5.0, 1.2, true, true, true
            )
            RETURNING id
        """),
        {
            "classification_id": test_classification,
            "country_id": test_country,
        },
    )
    return str(result.scalar_one())
