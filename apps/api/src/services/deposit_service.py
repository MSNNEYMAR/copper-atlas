"""
Copper Atlas — Deposit Service Layer
全局铜矿床图谱 — 矿床业务服务

Business logic layer between API routes and data repositories.
Handles validation, coordinate transformation, GeoJSON formatting,
and orchestration of multi-repository queries.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pyproj import Transformer
from sqlalchemy.ext.asyncio import AsyncSession

from ..exceptions import InvalidBboxError, InvalidSRIDError, NotFoundError, SpatialError
from ..repositories.deposit_repository import DepositRepository


class DepositService:
    """Business logic for deposit queries and transformations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DepositRepository(session)

    # ==========================================================================
    # DEPOSIT QUERIES
    # ==========================================================================

    async def list_deposits(
        self,
        *,
        mineral: str = "copper",
        bbox: Optional[str] = None,
        country: Optional[str] = None,
        deposit_type: Optional[str] = None,
        status: Optional[str] = None,
        min_tonnage: Optional[float] = None,
        max_tonnage: Optional[float] = None,
        min_grade: Optional[float] = None,
        max_grade: Optional[float] = None,
        search: Optional[str] = None,
        page: int = 1,
        size: int = 50,
        sort: str = "tonnage_mt",
        order: str = "desc",
    ) -> dict:
        """
        List deposits with spatial and attribute filters.
        Returns GeoJSON FeatureCollection with pagination metadata.
        """
        # Parse bbox if provided
        parsed_bbox = None
        if bbox:
            parsed_bbox = self._parse_bbox(bbox)

        # Parse comma-separated filters
        country_isos = country.split(",") if country else None
        statuses = [s.strip() for s in status.split(",")] if status else None

        # Execute query
        deposits, total = await self.repo.find_in_bbox(
            bbox=parsed_bbox or (-180, -90, 180, 90),  # Default: entire world
            mineral=mineral,
            country_isos=country_isos,
            deposit_type_path=deposit_type,
            statuses=statuses,
            min_tonnage=min_tonnage,
            max_tonnage=max_tonnage,
            min_grade=min_grade,
            max_grade=max_grade,
            search=search,
            page=page,
            size=size,
        )

        # Build GeoJSON FeatureCollection
        features = []
        for dep in deposits:
            feature = self._to_geojson_feature(dep)
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features,
            "meta": {
                "total": total,
                "page": page,
                "size": size,
                "pages": max(1, (total + size - 1) // size),
            },
        }

    async def get_deposit(self, deposit_id: UUID) -> dict:
        """Get a single deposit by UUID with full detail."""
        deposit = await self.repo.find_by_id(deposit_id)
        if not deposit:
            raise NotFoundError(f"Deposit with ID '{deposit_id}' not found")

        return self._to_geojson_detail_feature(deposit)

    async def get_deposit_by_slug(self, slug: str) -> dict:
        """Get a single deposit by slug."""
        deposit = await self.repo.find_by_slug(slug)
        if not deposit:
            raise NotFoundError(f"Deposit with slug '{slug}' not found")

        return self._to_geojson_detail_feature(deposit)

    async def get_nearby(
        self,
        deposit_id: UUID,
        radius_km: float = 50.0,
        mineral: Optional[str] = None,
        limit: int = 10,
    ) -> dict:
        """Find deposits near a given deposit."""
        # First get the center deposit's coordinates
        detail = await self.repo.find_by_id(deposit_id)
        if not detail:
            raise NotFoundError(f"Deposit with ID '{deposit_id}' not found")

        lon = detail.get("longitude")
        lat = detail.get("latitude")
        if lon is None or lat is None:
            raise SpatialError("Deposit has no location coordinates")

        # Find nearby deposits
        nearby = await self.repo.find_nearby(
            longitude=lon,
            latitude=lat,
            radius_km=radius_km,
            mineral=mineral,
            exclude_id=deposit_id,
            limit=limit,
        )

        features = [self._to_geojson_feature(dep) for dep in nearby]

        return {
            "type": "FeatureCollection",
            "features": features,
            "meta": {
                "center": {"longitude": lon, "latitude": lat},
                "radius_km": radius_km,
                "total": len(features),
            },
        }

    # ==========================================================================
    # STATISTICS
    # ==========================================================================

    async def get_summary(self, mineral: str = "copper") -> dict:
        """Get summary statistics for a mineral type."""
        return await self.repo.get_summary(mineral=mineral)

    async def get_by_country(self, mineral: str = "copper", top_n: int = 20) -> list[dict]:
        """Get deposit statistics aggregated by country."""
        return await self.repo.count_by_country(mineral=mineral, top_n=top_n)

    async def get_by_type(self, mineral: str = "copper") -> list[dict]:
        """Get deposit statistics aggregated by deposit type."""
        return await self.repo.count_by_type(mineral=mineral)

    async def get_by_status(self, mineral: str = "copper") -> list[dict]:
        """Get deposit statistics aggregated by operational status."""
        return await self.repo.count_by_status(mineral=mineral)

    async def get_tonnage_distribution(
        self, mineral: str = "copper", buckets: int = 20
    ) -> list[dict]:
        """Get tonnage histogram data."""
        return await self.repo.tonnage_distribution(mineral=mineral, buckets=buckets)

    async def get_grade_distribution(
        self, mineral: str = "copper", buckets: int = 20
    ) -> list[dict]:
        """Get grade histogram data."""
        return await self.repo.grade_distribution(mineral=mineral, buckets=buckets)

    # ==========================================================================
    # SEARCH
    # ==========================================================================

    async def search(
        self, query: str, mineral: str = "copper", language: str = "en", limit: int = 10
    ) -> list[dict]:
        """Full-text search across deposits."""
        return await self.repo.search(query_str=query, mineral=mineral, language=language, limit=limit)

    async def autocomplete(
        self, prefix: str, mineral: str = "copper", limit: int = 5
    ) -> list[dict]:
        """Prefix autocomplete for deposit names."""
        return await self.repo.autocomplete(prefix=prefix, mineral=mineral, limit=limit)

    # ==========================================================================
    # COORDINATE TRANSFORMATION
    # ==========================================================================

    @staticmethod
    def transform_coordinates(
        longitude: float,
        latitude: float,
        from_srid: int = 4326,
        to_srid: int = 3857,
    ) -> dict:
        """
        Transform coordinates between spatial reference systems.

        Supported SRIDs:
          4326 — WGS84 (GPS coordinates)
          3857 — Web Mercator (map display)
          Any EPSG code supported by pyproj
        """
        try:
            transformer = Transformer.from_crs(
                f"EPSG:{from_srid}",
                f"EPSG:{to_srid}",
                always_xy=True,
            )
            x, y = transformer.transform(longitude, latitude)
            return {
                "from_srid": from_srid,
                "to_srid": to_srid,
                "input": {"longitude": longitude, "latitude": latitude},
                "output": {"x": x, "y": y},
            }
        except Exception as e:
            raise InvalidSRIDError(
                f"Coordinate transformation failed: {e}",
                details={"from_srid": from_srid, "to_srid": to_srid},
            )

    # ==========================================================================
    # GEOJSON HELPERS
    # ==========================================================================

    def _to_geojson_feature(self, deposit: dict) -> dict:
        """Convert a deposit dict to a GeoJSON Feature (Point)."""
        lon = deposit.get("longitude")
        lat = deposit.get("latitude")

        return {
            "type": "Feature",
            "id": deposit.get("id"),
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat] if lon is not None and lat is not None else None,
            },
            "properties": {
                k: v for k, v in deposit.items()
                if k not in ("id", "longitude", "latitude")
            },
        }

    def _to_geojson_detail_feature(self, deposit: dict) -> dict:
        """Convert a full deposit detail dict to a GeoJSON Feature."""
        lon = deposit.get("longitude")
        lat = deposit.get("latitude")

        return {
            "type": "Feature",
            "id": deposit.get("id"),
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat] if lon is not None and lat is not None else None,
            },
            "properties": {
                k: v for k, v in deposit.items()
                if k not in ("id", "longitude", "latitude")
            },
        }

    def _parse_bbox(self, bbox_str: str) -> tuple[float, float, float, float]:
        """
        Parse a comma-separated bbox string into (minLon, minLat, maxLon, maxLat).

        Validates that coordinates are within WGS84 range.
        """
        try:
            parts = [float(p.strip()) for p in bbox_str.split(",")]
        except ValueError:
            raise InvalidBboxError(
                f"Bbox must be comma-separated numbers: minLon,minLat,maxLon,maxLat",
                details={"bbox": bbox_str},
            )

        if len(parts) != 4:
            raise InvalidBboxError(
                f"Bbox requires exactly 4 values (got {len(parts)})",
                details={"bbox": bbox_str},
            )

        min_lon, min_lat, max_lon, max_lat = parts

        # Validate ranges
        if min_lon < -180 or min_lon > 180:
            raise InvalidBboxError(
                f"minLon must be between -180 and 180 (got {min_lon})",
            )
        if max_lon < -180 or max_lon > 180:
            raise InvalidBboxError(
                f"maxLon must be between -180 and 180 (got {max_lon})",
            )
        if min_lat < -90 or min_lat > 90:
            raise InvalidBboxError(
                f"minLat must be between -90 and 90 (got {min_lat})",
            )
        if max_lat < -90 or max_lat > 90:
            raise InvalidBboxError(
                f"maxLat must be between -90 and 90 (got {max_lat})",
            )
        if min_lon >= max_lon:
            raise InvalidBboxError(
                f"minLon must be less than maxLon ({min_lon} >= {max_lon})",
            )
        if min_lat >= max_lat:
            raise InvalidBboxError(
                f"minLat must be less than maxLat ({min_lat} >= {max_lat})",
            )

        return (min_lon, min_lat, max_lon, max_lat)
