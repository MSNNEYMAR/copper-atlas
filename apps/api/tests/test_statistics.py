"""
Copper Atlas — Statistics API Tests
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_summary_empty(client: AsyncClient):
    """Summary endpoint should work even with no data."""
    response = await client.get("/api/v1/statistics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_deposits"] == 0
    assert data["countries_count"] == 0


@pytest.mark.asyncio
async def test_summary_with_data(client: AsyncClient, test_deposit: str):
    """Summary should reflect test data."""
    response = await client.get("/api/v1/statistics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_deposits"] >= 1
    assert data["total_tonnage_mt"] is not None
    assert data["avg_grade_pct"] is not None


@pytest.mark.asyncio
async def test_by_country(client: AsyncClient, test_deposit: str):
    """By-country aggregation."""
    response = await client.get("/api/v1/statistics/by-country")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    country = data[0]
    assert "deposit_count" in country
    assert "total_tonnage" in country


@pytest.mark.asyncio
async def test_by_type(client: AsyncClient, test_deposit: str):
    """By-type aggregation."""
    response = await client.get("/api/v1/statistics/by-type")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_by_status(client: AsyncClient, test_deposit: str):
    """By-status aggregation."""
    response = await client.get("/api/v1/statistics/by-status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    production = [d for d in data if d["status"] == "production"]
    assert len(production) >= 1
    assert production[0]["count"] >= 1


@pytest.mark.asyncio
async def test_tonnage_distribution(client: AsyncClient, test_deposit: str):
    """Tonnage histogram."""
    response = await client.get("/api/v1/statistics/tonnage-distribution?buckets=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
