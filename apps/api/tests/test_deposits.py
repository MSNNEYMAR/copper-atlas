"""
Copper Atlas — Deposit API Tests
全局铜矿床图谱 — 矿床 API 测试

Tests for:
  - GET  /api/v1/deposits          — Listing with bbox + filters
  - GET  /api/v1/deposits/{id}     — Single deposit detail
  - GET  /api/v1/deposits/slug/... — By slug lookup
  - GET  /api/v1/deposits/{id}/nearby — Nearby deposits
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_deposits_empty(client: AsyncClient):
    """Listing with no data should return empty FeatureCollection."""
    response = await client.get("/api/v1/deposits")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["meta"]["total"] == 0
    assert len(data["features"]) == 0


@pytest.mark.asyncio
async def test_list_deposits_with_test_data(
    client: AsyncClient,
    test_deposit: str,
):
    """Listing should return test deposits."""
    response = await client.get("/api/v1/deposits")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["meta"]["total"] >= 1
    assert len(data["features"]) >= 1

    feature = data["features"][0]
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Point"
    assert feature["properties"]["name"] == "Test Deposit"
    assert feature["properties"]["primary_mineral"] == "copper"
    assert feature["properties"]["status"] == "production"


@pytest.mark.asyncio
async def test_list_deposits_bbox_filter(
    client: AsyncClient,
    test_deposit: str,
):
    """Bounding box filter should return only deposits within the bbox."""
    # BBox that contains the test deposit at (10.0, 20.0)
    response = await client.get(
        "/api/v1/deposits?bbox=9.0,19.0,11.0,21.0"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] >= 1

    # BBox that does NOT contain the test deposit
    response = await client.get(
        "/api/v1/deposits?bbox=100.0,50.0,110.0,60.0"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_list_deposits_pagination(
    client: AsyncClient,
    test_deposit: str,
):
    """Test pagination parameters."""
    response = await client.get("/api/v1/deposits?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["page"] == 1
    assert data["meta"]["size"] == 10
    assert data["meta"]["pages"] >= 1


@pytest.mark.asyncio
async def test_get_deposit_by_id(
    client: AsyncClient,
    test_deposit: str,
):
    """Get a single deposit by UUID."""
    response = await client.get(f"/api/v1/deposits/{test_deposit}")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Feature"
    assert data["id"] == test_deposit
    assert data["properties"]["name"] == "Test Deposit"
    assert data["properties"]["tonnage_mt"] == 5.0
    assert data["properties"]["tonnage_grade_pct"] == 1.2


@pytest.mark.asyncio
async def test_get_deposit_not_found(client: AsyncClient):
    """Non-existent deposit should return 404."""
    response = await client.get(
        "/api/v1/deposits/00000000-0000-0000-0000-000000000000"
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_deposit_by_slug(
    client: AsyncClient,
    test_deposit: str,
):
    """Get a deposit by its slug."""
    response = await client.get("/api/v1/deposits/slug/test-deposit")
    assert response.status_code == 200
    data = response.json()
    assert data["properties"]["slug"] == "test-deposit"


@pytest.mark.asyncio
async def test_list_deposits_country_filter(
    client: AsyncClient,
    test_deposit: str,
):
    """Country filter should filter by ISO code."""
    # Filter by test country
    response = await client.get("/api/v1/deposits?country=TS")
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] >= 1

    # Filter by non-matching country
    response = await client.get("/api/v1/deposits?country=ZZ")
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_list_deposits_status_filter(
    client: AsyncClient,
    test_deposit: str,
):
    """Status filter should work."""
    response = await client.get("/api/v1/deposits?status=production")
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] >= 1

    response = await client.get("/api/v1/deposits?status=exploration")
    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_list_deposits_invalid_bbox(client: AsyncClient):
    """Invalid bbox should return 400."""
    # Out of range
    response = await client.get("/api/v1/deposits?bbox=-200,-100,200,100")
    assert response.status_code == 400

    # Wrong format
    response = await client.get("/api/v1/deposits?bbox=1,2,3")
    assert response.status_code == 422  # FastAPI validation
