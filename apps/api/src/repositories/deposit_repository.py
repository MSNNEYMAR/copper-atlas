"""
Copper Atlas — Deposit Spatial Repository
全局铜矿床图谱 — 矿床空间查询仓库

Performance-critical spatial query implementations.
All queries use PostGIS GiST indexes. Execution plans verified with EXPLAIN ANALYZE.

Query patterns:
  - bbox query (ST_Intersects) — most critical, hits idx_deposits_location
  - radius query (ST_DWithin) — for "nearby deposits"
  - full-text search (tsvector + tsquery) — hits idx_deposits_search_en
  - filtered bbox — composite filters on top of spatial intersection
"""

from __future__ import annotations

from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.deposit import Country, Deposit, DepositClassification


class DepositRepository:
    """Data access for deposit spatial queries and CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ==========================================================================
    # SPATIAL QUERIES
    # ==========================================================================

    async def find_in_bbox(
        self,
        bbox: tuple[float, float, float, float],
        *,
        mineral: str = "copper",
        country_isos: list[str] | None = None,
        deposit_type_path: str | None = None,
        statuses: list[str] | None = None,
        min_tonnage: float | None = None,
        max_tonnage: float | None = None,
        min_grade: float | None = None,
        max_grade: float | None = None,
        min_age_ma: float | None = None,
        max_age_ma: float | None = None,
        search: str | None = None,
        page: int = 1,
        size: int = 50,
        sort: str = "tonnage_mt",
        order: str = "desc",
    ) -> tuple[list[dict], int]:
        """
        Find deposits within a bounding box with optional filters.

        Performance target: <50ms for 10K deposits with GiST index (warm cache).

        Args:
            bbox: (minLon, minLat, maxLon, maxLat) in WGS84
            mineral: Mineral type string
            country_isos: Filter by country ISO codes
            deposit_type_path: Filter by ltree path (e.g., 'por' matches all porphyry)
            statuses: Filter by operational status
            min_tonnage, max_tonnage: Tonnage range in Mt
            min_grade, max_grade: Grade range in %
            min_age_ma, max_age_ma: Mineralization age range in Ma
            search: Full-text search query
            page, size: Pagination
            sort: Sort field
            order: 'asc' or 'desc'

        Returns:
            Tuple of (deposit_dicts, total_count)
        """
        # Build the spatial envelope
        min_lon, min_lat, max_lon, max_lat = bbox
        envelope = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)

        # Base query with JOINs for classification and country
        query = (
            select(
                Deposit,
                Country.iso_code.label("country_iso"),
                Country.name_en.label("country_name_en"),
                Country.name_zh.label("country_name_zh"),
                DepositClassification.code.label("classification_code"),
                DepositClassification.name_en.label("classification_name_en"),
                DepositClassification.name_zh.label("classification_name_zh"),
                DepositClassification.path.label("classification_path"),
            )
            .join(Country, Deposit.country_id == Country.id)
            .join(DepositClassification, Deposit.deposit_classification_id == DepositClassification.id)
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_public.is_(True))
            .where(Deposit.is_active.is_(True))
            .where(func.ST_Intersects(Deposit.location, envelope))
        )

        # Apply optional filters
        if country_isos:
            query = query.where(Country.iso_code.in_(country_isos))

        if deposit_type_path:
            # ltree ancestor match: 'por' matches 'por', 'por.cumo', 'por.cuau'
            query = query.where(
                func.text("path <@ :ltree_path")
            ).params(ltree_path=deposit_type_path)

        if statuses:
            query = query.where(Deposit.status.in_(statuses))

        if min_tonnage is not None:
            query = query.where(Deposit.tonnage_mt >= min_tonnage)
        if max_tonnage is not None:
            query = query.where(Deposit.tonnage_mt <= max_tonnage)

        if min_grade is not None:
            query = query.where(Deposit.tonnage_grade_pct >= min_grade)
        if max_grade is not None:
            query = query.where(Deposit.tonnage_grade_pct <= max_grade)

        if min_age_ma is not None:
            query = query.where(Deposit.mineralization_age_ma >= min_age_ma)
        if max_age_ma is not None:
            query = query.where(Deposit.mineralization_age_ma <= max_age_ma)

        if search:
            # Full-text search with ts_rank for relevance scoring
            tsquery = func.plainto_tsquery("english", search)
            query = query.where(
                func.to_tsvector(
                    "english",
                    func.coalesce(Deposit.name, "") + " " + func.coalesce(Deposit.summary_en, ""),
                ).op("@@")(tsquery)
            )

        # Count total (before pagination)
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply sorting
        sort_column = getattr(Deposit, sort, Deposit.tonnage_mt)
        if order == "desc":
            query = query.order_by(sort_column.desc().nullslast())
        else:
            query = query.order_by(sort_column.asc().nullslast())

        # Apply pagination
        query = query.offset((page - 1) * size).limit(size)

        # Execute
        result = await self.session.execute(query)
        rows = result.all()

        # Convert to list of dicts
        deposits = [
            self._row_to_geojson_properties(row) for row in rows
        ]

        return deposits, total

    async def find_by_id(self, deposit_id: UUID) -> dict | None:
        """Get a single deposit by UUID with full detail."""
        query = (
            select(
                Deposit,
                Country.iso_code.label("country_iso"),
                Country.name_en.label("country_name_en"),
                Country.name_zh.label("country_name_zh"),
                DepositClassification,
            )
            .join(Country, Deposit.country_id == Country.id)
            .join(DepositClassification, Deposit.deposit_classification_id == DepositClassification.id)
            .where(Deposit.id == deposit_id)
            .where(Deposit.is_active.is_(True))
        )

        result = await self.session.execute(query)
        row = result.first()

        if not row:
            return None

        return self._row_to_detail_dict(row)

    async def find_by_slug(self, slug: str) -> dict | None:
        """Get a single deposit by slug."""
        query = (
            select(Deposit)
            .where(Deposit.slug == slug)
            .where(Deposit.is_active.is_(True))
        )
        result = await self.session.execute(query)
        deposit = result.scalar_one_or_none()

        if not deposit:
            return None

        return await self.find_by_id(deposit.id)

    async def find_nearby(
        self,
        longitude: float,
        latitude: float,
        radius_km: float,
        *,
        mineral: str | None = None,
        exclude_id: UUID | None = None,
        limit: int = 10,
    ) -> list[dict]:
        """
        Find deposits within a radius using ST_DWithin with geography cast.
        Uses spherical distance computation for accuracy.
        """
        center = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)

        # ST_DWithin on geography type for accurate great-circle distance
        distance_filter = func.ST_DWithin(
            Deposit.location.cast(Geography(srid=4326)),
            center.cast(Geography(srid=4326)),
            radius_km * 1000,  # Convert km to meters
        )

        query = (
            select(
                Deposit,
                Country.iso_code.label("country_iso"),
                Country.name_en.label("country_name_en"),
                DepositClassification.code.label("classification_code"),
                DepositClassification.name_en.label("classification_name_en"),
            )
            .join(Country, Deposit.country_id == Country.id)
            .join(DepositClassification, Deposit.deposit_classification_id == DepositClassification.id)
            .where(distance_filter)
            .where(Deposit.is_public.is_(True))
            .where(Deposit.is_active.is_(True))
        )

        if mineral:
            query = query.where(Deposit.primary_mineral == mineral)
        if exclude_id:
            query = query.where(Deposit.id != exclude_id)

        # Order by distance
        distance_expr = func.ST_Distance(
            Deposit.location.cast(Geography(srid=4326)),
            center.cast(Geography(srid=4326)),
        )
        query = query.order_by(distance_expr).limit(limit)

        result = await self.session.execute(query)
        rows = result.all()

        return [self._row_to_geojson_properties(row) for row in rows]

    # ==========================================================================
    # AGGREGATION QUERIES (for statistics)
    # ==========================================================================

    async def count_by_country(self, mineral: str = "copper", top_n: int = 20) -> list[dict]:
        """Aggregate deposit count and tonnage by country."""
        query = (
            select(
                Country.iso_code,
                Country.name_en,
                Country.name_zh,
                func.count(Deposit.id).label("deposit_count"),
                func.sum(Deposit.tonnage_mt).label("total_tonnage"),
                func.avg(Deposit.tonnage_grade_pct).label("avg_grade"),
            )
            .join(Deposit, Deposit.country_id == Country.id)
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_active.is_(True))
            .group_by(Country.iso_code, Country.name_en, Country.name_zh)
            .order_by(func.count(Deposit.id).desc())
            .limit(top_n)
        )
        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]

    async def count_by_type(self, mineral: str = "copper") -> list[dict]:
        """Aggregate deposit count and tonnage by deposit type."""
        query = (
            select(
                DepositClassification.code,
                DepositClassification.name_en,
                DepositClassification.name_zh,
                func.count(Deposit.id).label("count"),
                func.sum(Deposit.tonnage_mt).label("total_tonnage"),
                func.avg(Deposit.tonnage_grade_pct).label("avg_grade"),
            )
            .join(Deposit, Deposit.deposit_classification_id == DepositClassification.id)
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_active.is_(True))
            .where(DepositClassification.depth == 1)  # Top-level only
            .group_by(DepositClassification.code, DepositClassification.name_en, DepositClassification.name_zh)
            .order_by(func.count(Deposit.id).desc())
        )
        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]

    async def count_by_status(self, mineral: str = "copper") -> list[dict]:
        """Aggregate deposit count by operational status."""
        query = (
            select(
                Deposit.status,
                func.count(Deposit.id).label("count"),
                func.sum(Deposit.tonnage_mt).label("total_tonnage"),
            )
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_active.is_(True))
            .group_by(Deposit.status)
            .order_by(func.count(Deposit.id).desc())
        )
        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]

    async def tonnage_distribution(
        self, mineral: str = "copper", buckets: int = 20
    ) -> list[dict]:
        """Generate a tonnage histogram."""
        query = text(
            """
            SELECT
                width_bucket(tonnage_mt, 0, 100, :buckets) AS bucket,
                COUNT(*) AS count,
                MIN(tonnage_mt) AS range_min,
                MAX(tonnage_mt) AS range_max
            FROM deposits
            WHERE primary_mineral = :mineral
              AND tonnage_mt IS NOT NULL
              AND is_active = true
            GROUP BY bucket
            ORDER BY bucket
            """
        )
        result = await self.session.execute(query, {"mineral": mineral, "buckets": buckets})
        return [dict(r._mapping) for r in result.all()]

    async def grade_distribution(
        self, mineral: str = "copper", buckets: int = 20
    ) -> list[dict]:
        """Generate a grade histogram."""
        query = text(
            """
            SELECT
                width_bucket(tonnage_grade_pct, 0, 5, :buckets) AS bucket,
                COUNT(*) AS count,
                MIN(tonnage_grade_pct) AS range_min,
                MAX(tonnage_grade_pct) AS range_max
            FROM deposits
            WHERE primary_mineral = :mineral
              AND tonnage_grade_pct IS NOT NULL
              AND is_active = true
            GROUP BY bucket
            ORDER BY bucket
            """
        )
        result = await self.session.execute(query, {"mineral": mineral, "buckets": buckets})
        return [dict(r._mapping) for r in result.all()]

    async def get_summary(self, mineral: str = "copper") -> dict:
        """Get summary statistics."""
        query = select(
            func.count(Deposit.id).label("total_deposits"),
            func.sum(Deposit.tonnage_mt).label("total_tonnage"),
            func.avg(Deposit.tonnage_grade_pct).label("avg_grade"),
            func.count(func.distinct(Deposit.country_id)).label("countries_count"),
            func.count(Deposit.id).filter(Deposit.status == "production").label("producing_count"),
        ).where(
            Deposit.primary_mineral == mineral,
            Deposit.is_active.is_(True),
        )
        result = await self.session.execute(query)
        row = result.first()

        # Get largest deposit
        largest_query = (
            select(Deposit.name, Deposit.slug, Deposit.tonnage_mt)
            .where(Deposit.primary_mineral == mineral, Deposit.is_active.is_(True))
            .where(Deposit.tonnage_mt.isnot(None))
            .order_by(Deposit.tonnage_mt.desc())
            .limit(1)
        )
        largest_result = await self.session.execute(largest_query)
        largest = largest_result.first()

        # Get highest grade deposit
        grade_query = (
            select(Deposit.name, Deposit.slug, Deposit.tonnage_grade_pct)
            .where(Deposit.primary_mineral == mineral, Deposit.is_active.is_(True))
            .where(Deposit.tonnage_grade_pct.isnot(None))
            .order_by(Deposit.tonnage_grade_pct.desc())
            .limit(1)
        )
        grade_result = await self.session.execute(grade_query)
        highest = grade_result.first()

        return {
            "total_deposits": row.total_deposits,
            "total_tonnage_mt": float(row.total_tonnage) if row.total_tonnage else None,
            "avg_grade_pct": float(row.avg_grade) if row.avg_grade else None,
            "countries_count": row.countries_count,
            "producing_count": row.producing_count,
            "largest_deposit": (
                {"name": largest.name, "slug": largest.slug, "tonnage_mt": float(largest.tonnage_mt)}
                if largest else None
            ),
            "highest_grade_deposit": (
                {"name": highest.name, "slug": highest.slug, "grade_pct": float(highest.tonnage_grade_pct)}
                if highest else None
            ),
        }

    # ==========================================================================
    # FULL-TEXT SEARCH
    # ==========================================================================

    async def search(
        self,
        query_str: str,
        mineral: str = "copper",
        language: str = "en",
        limit: int = 10,
    ) -> list[dict]:
        """Full-text search across deposit names and descriptions."""
        tsquery = func.plainto_tsquery(language, query_str)
        tsvector = func.to_tsvector(
            language,
            func.coalesce(Deposit.name, "")
            + " "
            + func.coalesce(Deposit.summary_en, "")
            + " "
            + func.coalesce(func.array_to_string(Deposit.alternative_names, " "), ""),
        )

        rank = func.ts_rank(tsvector, tsquery)

        query = (
            select(
                Deposit.id,
                Deposit.name,
                Deposit.slug,
                Deposit.primary_mineral,
                Deposit.status,
                Deposit.tonnage_mt,
                Country.iso_code.label("country_iso"),
                Country.name_en.label("country_name_en"),
                DepositClassification.name_en.label("classification_name_en"),
                rank.label("relevance"),
            )
            .join(Country, Deposit.country_id == Country.id)
            .join(DepositClassification, Deposit.deposit_classification_id == DepositClassification.id)
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_active.is_(True))
            .where(tsvector.op("@@")(tsquery))
            .order_by(rank.desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]

    async def autocomplete(
        self,
        prefix: str,
        mineral: str = "copper",
        limit: int = 5,
    ) -> list[dict]:
        """Prefix-based autocomplete using trigram matching."""
        query = (
            select(
                Deposit.id,
                Deposit.name,
                Deposit.slug,
                Deposit.primary_mineral,
                Country.iso_code.label("country_iso"),
                Country.name_en.label("country_name_en"),
                func.similarity(Deposit.name, prefix).label("similarity"),
            )
            .join(Country, Deposit.country_id == Country.id)
            .where(Deposit.primary_mineral == mineral)
            .where(Deposit.is_active.is_(True))
            .where(Deposit.name.ilike(f"{prefix}%"))
            .order_by(func.similarity(Deposit.name, prefix).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        return [dict(r._mapping) for r in result.all()]

    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================

    def _row_to_geojson_properties(self, row: tuple) -> dict:
        """
        Convert a SQLAlchemy row (Deposit + joined columns) to GeoJSON properties dict.
        Used for FeatureCollection responses.
        """
        deposit = row[0]  # Deposit is always the first column

        # Extract joined columns from the row
        data = dict(row._mapping)

        return {
            "id": str(deposit.id),
            "name": deposit.name,
            "name_zh": deposit.name_zh,
            "slug": deposit.slug,
            "primary_mineral": deposit.primary_mineral,
            "secondary_minerals": deposit.secondary_minerals,
            "status": deposit.status,
            "tonnage_mt": float(deposit.tonnage_mt) if deposit.tonnage_mt else None,
            "tonnage_grade_pct": float(deposit.tonnage_grade_pct) if deposit.tonnage_grade_pct else None,
            "tonnage_confidence": deposit.tonnage_confidence,
            "discovery_year": deposit.discovery_year,
            "operator_company": deposit.operator_company,
            "mining_method": deposit.mining_method,
            "host_rock_age_text": deposit.host_rock_age_text,
            "tectonic_setting": deposit.tectonic_setting,
            "geological_province": deposit.geological_province,
            "data_quality_score": deposit.data_quality_score,
            "is_featured": deposit.is_featured,
            "country_iso": data.get("country_iso"),
            "country_name_en": data.get("country_name_en"),
            "country_name_zh": data.get("country_name_zh"),
            "deposit_type_code": data.get("classification_code"),
            "deposit_type_name_en": data.get("classification_name_en"),
            "deposit_type_name_zh": data.get("classification_name_zh"),
            "deposit_type_path": str(data.get("classification_path", "")),
            "tags": deposit.tags,
            "data_source": deposit.data_source,
        }

    def _row_to_detail_dict(self, row: tuple) -> dict:
        """Convert a detail query row to a full detail dict."""
        deposit = row[0]
        data = dict(row._mapping)

        return {
            "id": str(deposit.id),
            "name": deposit.name,
            "name_zh": deposit.name_zh,
            "slug": deposit.slug,
            "alternative_names": deposit.alternative_names,
            "primary_mineral": deposit.primary_mineral,
            "secondary_minerals": deposit.secondary_minerals,
            "status": deposit.status,
            # Location
            "longitude": deposit.location.data[0] if deposit.location.data else None,
            "latitude": deposit.location.data[1] if deposit.location.data else None,
            "elevation_m": float(deposit.elevation_m) if deposit.elevation_m else None,
            "source_srid": deposit.source_srid,
            # Tonnage
            "tonnage_mt": float(deposit.tonnage_mt) if deposit.tonnage_mt else None,
            "tonnage_mt_low": float(deposit.tonnage_mt_low) if deposit.tonnage_mt_low else None,
            "tonnage_mt_high": float(deposit.tonnage_mt_high) if deposit.tonnage_mt_high else None,
            "tonnage_grade_pct": float(deposit.tonnage_grade_pct) if deposit.tonnage_grade_pct else None,
            "tonnage_cutoff_pct": float(deposit.tonnage_cutoff_pct) if deposit.tonnage_cutoff_pct else None,
            "tonnage_confidence": deposit.tonnage_confidence,
            "proven_mt": float(deposit.proven_mt) if deposit.proven_mt else None,
            "probable_mt": float(deposit.probable_mt) if deposit.probable_mt else None,
            "measured_mt": float(deposit.measured_mt) if deposit.measured_mt else None,
            "indicated_mt": float(deposit.indicated_mt) if deposit.indicated_mt else None,
            "inferred_mt": float(deposit.inferred_mt) if deposit.inferred_mt else None,
            # Operational
            "discovery_year": deposit.discovery_year,
            "production_start_year": deposit.production_start_year,
            "production_end_year": deposit.production_end_year,
            "operator_company": deposit.operator_company,
            "owner_companies": deposit.owner_companies,
            "mining_method": deposit.mining_method,
            # Geological
            "host_rock_type": deposit.host_rock_type,
            "host_rock_age_text": deposit.host_rock_age_text,
            "mineralization_age_ma": float(deposit.mineralization_age_ma) if deposit.mineralization_age_ma else None,
            "mineralization_age_error_ma": float(deposit.mineralization_age_error_ma) if deposit.mineralization_age_error_ma else None,
            "mineralization_age_method": deposit.mineralization_age_method,
            "tectonic_setting": deposit.tectonic_setting,
            "geological_province": deposit.geological_province,
            "metallogenic_belt": deposit.metallogenic_belt,
            # Description
            "summary_en": deposit.summary_en,
            "summary_zh": deposit.summary_zh,
            "geology_en": deposit.geology_en,
            "geology_zh": deposit.geology_zh,
            # References
            "data_source": deposit.data_source,
            "data_source_url": deposit.data_source_url,
            "reference_dois": deposit.reference_dois,
            "last_verified_date": str(deposit.last_verified_date) if deposit.last_verified_date else None,
            "data_quality_score": deposit.data_quality_score,
            # Media
            "images": deposit.images,
            "documents": deposit.documents,
            "tags": deposit.tags,
            # Extensible properties
            "properties": deposit.properties,
            # Joined
            "country_iso": data.get("country_iso"),
            "country_name_en": data.get("country_name_en"),
            "country_name_zh": data.get("country_name_zh"),
            "state_province": deposit.state_province,
            "deposit_type_code": data.get("classification_code") or (
                data.get("DepositClassification") and data.get("DepositClassification").code
            ),
            "deposit_type_name_en": data.get("classification_name_en") or (
                data.get("DepositClassification") and data.get("DepositClassification").name_en
            ),
            "deposit_type_name_zh": data.get("classification_name_zh") or (
                data.get("DepositClassification") and data.get("DepositClassification").name_zh
            ),
        }
