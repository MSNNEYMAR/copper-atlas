"""
Copper Atlas — Reference Data & Health API Tests
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health endpoint should return ok status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_list_minerals(client: AsyncClient, test_deposit: str):
    """Minerals endpoint should list available minerals."""
    response = await client.get("/api/v1/minerals")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    minerals = [m["mineral_code"] for m in data]
    assert "copper" in minerals


@pytest.mark.asyncio
async def test_list_countries(client: AsyncClient, test_deposit: str):
    """Countries endpoint should list countries with deposits."""
    response = await client.get("/api/v1/countries")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_list_deposit_types(client: AsyncClient, test_classification: str):
    """Deposit types endpoint should include test classification."""
    response = await client.get("/api/v1/deposit-types")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Our test classification should be there
    codes = [t["code"] for t in data]
    assert "TEST_TYPE" in codes


@pytest.mark.asyncio
async def test_list_statuses(client: AsyncClient):
    """Statuses endpoint should list valid values."""
    response = await client.get("/api/v1/statuses")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    values = [s["value"] for s in data]
    assert "production" in values
    assert "exploration" in values


@pytest.mark.asyncio
async def test_transform_coordinates(client: AsyncClient):
    """Coordinate transformation should work."""
    response = await client.post(
        "/api/v1/transform?longitude=-70.0&latitude=-33.0&from_srid=4326&to_srid=3857"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["from_srid"] == 4326
    assert data["to_srid"] == 3857
    assert "output" in data
    assert "x" in data["output"]
    assert "y" in data["output"]
