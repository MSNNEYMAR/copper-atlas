-- ============================================================================
-- Copper Atlas — Martin Vector Tile Functions
-- 全局铜矿床图谱 — Martin 矢量瓦片 SQL 函数
-- ============================================================================
-- These PostgreSQL functions are called by Martin to generate Mapbox Vector Tiles
-- (MVT) on the fly. Each function receives tile coordinates (z, x, y) and returns
-- a BYTEA-encoded MVT protobuf.
--
-- Rendering strategy by zoom level:
--   z 0-4:   Heatmap density layer (point count per cell, no individual points)
--   z 5-6:   Clustered markers with count badges
--   z 7-9:   Clustered markers with count + primary type indicator
--   z 10-12: Individual points, sized by tonnage
--   z 13-15: Individual points + deposit name labels
--   z 16-18: Individual points + detailed labels + mine outline (future)
--
-- Filter parameters are passed via query_params JSON to allow dynamic filtering
-- without creating hundreds of SQL function variants.
-- ============================================================================

-- ============================================================================
-- TILE: Copper deposits — Individual points (z >= 7)
-- ============================================================================
-- Used for medium to high zoom levels where individual deposits are visible.
-- Properties included in the tile are the minimum needed for rendering;
-- full deposit data is fetched via API when a user clicks a point.
-- ============================================================================
CREATE OR REPLACE FUNCTION martin_tile_copper_deposits(
    z INTEGER,
    x INTEGER,
    y INTEGER,
    query_params JSON DEFAULT '{}'::JSON
)
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    bounds GEOMETRY;
    mvt BYTEA;
    v_mineral VARCHAR(30) := COALESCE(query_params->>'mineral', 'copper');
    v_country_filter TEXT := query_params->>'country';
    v_type_filter TEXT := query_params->>'deposit_type';
    v_status_filter TEXT := query_params->>'status';
    v_min_tonnage NUMERIC := (query_params->>'min_tonnage')::NUMERIC;
    v_max_tonnage NUMERIC := (query_params->>'max_tonnage')::NUMERIC;
    v_min_grade NUMERIC := (query_params->>'min_grade')::NUMERIC;
    v_max_grade NUMERIC := (query_params->>'max_grade')::NUMERIC;
    v_min_age_ma NUMERIC := (query_params->>'min_age_ma')::NUMERIC;
    v_max_age_ma NUMERIC := (query_params->>'max_age_ma')::NUMERIC;
BEGIN
    -- Convert tile coordinates to a Web Mercator bounding box
    bounds := ST_TileEnvelope(z, x, y);

    SELECT ST_AsMVT(tile, 'copper_deposits', 4096, 'geom') INTO mvt
    FROM (
        SELECT
            d.id,
            d.name,
            d.slug,
            d.status,
            d.tonnage_mt,
            d.tonnage_grade_pct,
            d.primary_mineral,
            dc.code AS classification_code,
            dc.path::TEXT AS classification_path,
            c.iso_code AS country_iso,
            c.name_en AS country_name,

            -- Convert geometry to MVT tile coordinates
            ST_AsMVTGeom(
                ST_Transform(d.location, 3857),
                bounds,
                4096,
                256,
                true
            ) AS geom

        FROM deposits d
        JOIN countries c ON d.country_id = c.id
        JOIN deposit_classification dc ON d.deposit_classification_id = dc.id

        WHERE d.primary_mineral = v_mineral
          AND d.is_public = true
          AND d.is_active = true
          AND ST_Transform(d.location, 3857) && bounds

          -- Optional country filter (comma-separated ISO codes, or single)
          AND (
              v_country_filter IS NULL
              OR c.iso_code = ANY(string_to_array(v_country_filter, ','))
          )

          -- Optional deposit type filter (ltree match on path)
          AND (
              v_type_filter IS NULL
              OR dc.path <@ v_type_filter::LTREE
          )

          -- Optional status filter (comma-separated)
          AND (
              v_status_filter IS NULL
              OR d.status = ANY(string_to_array(v_status_filter, ','))
          )

          -- Optional tonnage range filter
          AND (
              v_min_tonnage IS NULL OR d.tonnage_mt >= v_min_tonnage
          )
          AND (
              v_max_tonnage IS NULL OR d.tonnage_mt <= v_max_tonnage
          )

          -- Optional grade range filter
          AND (
              v_min_grade IS NULL OR d.tonnage_grade_pct >= v_min_grade
          )
          AND (
              v_max_grade IS NULL OR d.tonnage_grade_pct <= v_max_grade
          )

          -- Optional mineralization age filter
          AND (
              v_min_age_ma IS NULL
              OR d.mineralization_age_ma >= v_min_age_ma
          )
          AND (
              v_max_age_ma IS NULL
              OR d.mineralization_age_ma <= v_max_age_ma
          )

        -- Performance: limit features per tile to prevent oversized MVT payloads
        LIMIT 5000
    ) AS tile
    WHERE geom IS NOT NULL;

    RETURN mvt;
END;
$$;


-- ============================================================================
-- TILE: Copper deposits — Clustered markers (z 5-9)
-- ============================================================================
-- Groups deposits by grid cells for medium zoom levels.
-- Cell size decreases as zoom increases, preventing visual overlap.
-- ============================================================================
CREATE OR REPLACE FUNCTION martin_tile_copper_clustered(
    z INTEGER,
    x INTEGER,
    y INTEGER,
    query_params JSON DEFAULT '{}'::JSON
)
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    bounds GEOMETRY;
    mvt BYTEA;
    v_mineral VARCHAR(30) := COALESCE(query_params->>'mineral', 'copper');
    v_country_filter TEXT := query_params->>'country';
    v_type_filter TEXT := query_params->>'deposit_type';
    v_status_filter TEXT := query_params->>'status';
    v_cell_size NUMERIC;  -- Grid cell size in Web Mercator meters
BEGIN
    bounds := ST_TileEnvelope(z, x, y);

    -- Adaptive grid cell size based on zoom level
    -- At z=5, a tile covers ~5000km → cells of ~200km
    -- At z=9, a tile covers ~300km  → cells of ~10km
    v_cell_size := CASE
        WHEN z <= 4 THEN 500000   -- 500km grid (global view)
        WHEN z = 5 THEN 200000    -- 200km grid
        WHEN z = 6 THEN 80000     -- 80km grid
        WHEN z = 7 THEN 30000     -- 30km grid
        WHEN z = 8 THEN 10000     -- 10km grid
        ELSE 5000                  -- 5km grid (close to individual points)
    END;

    SELECT ST_AsMVT(tile, 'copper_clustered', 4096, 'geom') INTO mvt
    FROM (
        SELECT
            COUNT(*) AS point_count,
            SUM(d.tonnage_mt) AS total_tonnage,
            AVG(d.tonnage_grade_pct) AS avg_grade,
            MIN(d.tonnage_mt) AS min_tonnage,
            MAX(d.tonnage_mt) AS max_tonnage,

            -- Collect unique classification paths to show diversity
            ARRAY_AGG(DISTINCT dc.code ORDER BY dc.code) AS classification_codes,
            ARRAY_AGG(DISTINCT c.iso_code ORDER BY c.iso_code) AS country_isos,

            -- Cluster centroid (in Web Mercator, snapped to grid)
            ST_AsMVTGeom(
                ST_Transform(
                    ST_SnapToGrid(
                        ST_Centroid(ST_Collect(ST_Transform(d.location, 3857))),
                        v_cell_size
                    ),
                    3857
                ),
                bounds,
                4096,
                256,
                true
            ) AS geom

        FROM deposits d
        JOIN countries c ON d.country_id = c.id
        JOIN deposit_classification dc ON d.deposit_classification_id = dc.id

        WHERE d.primary_mineral = v_mineral
          AND d.is_public = true
          AND d.is_active = true
          AND ST_Transform(d.location, 3857) && bounds

          AND (
              v_country_filter IS NULL
              OR c.iso_code = ANY(string_to_array(v_country_filter, ','))
          )
          AND (
              v_type_filter IS NULL
              OR dc.path <@ v_type_filter::LTREE
          )
          AND (
              v_status_filter IS NULL
              OR d.status = ANY(string_to_array(v_status_filter, ','))
          )

        GROUP BY ST_SnapToGrid(ST_Transform(d.location, 3857), v_cell_size)
    ) AS tile
    WHERE geom IS NOT NULL;

    RETURN mvt;
END;
$$;


-- ============================================================================
-- TILE: Copper deposits — Heatmap density (z 0-4)
-- ============================================================================
-- Grid-based density for very low zoom levels.
-- Returns aggregated count per cell, rendered as a heatmap layer.
-- ============================================================================
CREATE OR REPLACE FUNCTION martin_tile_copper_heatmap(
    z INTEGER,
    x INTEGER,
    y INTEGER,
    query_params JSON DEFAULT '{}'::JSON
)
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    bounds GEOMETRY;
    mvt BYTEA;
    v_mineral VARCHAR(30) := COALESCE(query_params->>'mineral', 'copper');
    v_cell_size NUMERIC;
BEGIN
    bounds := ST_TileEnvelope(z, x, y);

    -- Large grid cells for low-zoom density view
    v_cell_size := CASE
        WHEN z <= 2 THEN 2000000   -- 2000km (continent-scale)
        WHEN z = 3 THEN 1000000    -- 1000km
        ELSE 300000                 -- 300km
    END;

    SELECT ST_AsMVT(tile, 'copper_heatmap', 4096, 'geom') INTO mvt
    FROM (
        SELECT
            COUNT(*) AS density,
            SUM(d.tonnage_mt) AS total_tonnage,
            ST_AsMVTGeom(
                ST_Transform(
                    ST_SnapToGrid(
                        ST_Centroid(ST_Collect(ST_Transform(d.location, 3857))),
                        v_cell_size
                    ),
                    3857
                ),
                bounds,
                4096,
                256,
                true
            ) AS geom
        FROM deposits d
        WHERE d.primary_mineral = v_mineral
          AND d.is_public = true
          AND d.is_active = true
          AND ST_Transform(d.location, 3857) && bounds
        GROUP BY ST_SnapToGrid(ST_Transform(d.location, 3857), v_cell_size)
    ) AS tile
    WHERE geom IS NOT NULL;

    RETURN mvt;
END;
$$;


-- ============================================================================
-- TILE: Country boundaries (low-resolution, for reference overlay)
-- ============================================================================
CREATE OR REPLACE FUNCTION martin_tile_countries(
    z INTEGER,
    x INTEGER,
    y INTEGER,
    query_params JSON DEFAULT '{}'::JSON
)
RETURNS BYTEA
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
    bounds GEOMETRY;
    mvt BYTEA;
BEGIN
    bounds := ST_TileEnvelope(z, x, y);

    SELECT ST_AsMVT(tile, 'countries', 4096, 'geom') INTO mvt
    FROM (
        SELECT
            c.id,
            c.iso_code,
            c.name_en,
            c.name_zh,
            c.continent,
            ST_AsMVTGeom(ST_SimplifyPreserveTopology(c.geom, 1.0 / POWER(2, z)), bounds, 4096, 256, true) AS geom
        FROM countries c
        WHERE c.geom IS NOT NULL
          AND ST_Transform(c.geom, 3857) && bounds
    ) AS tile
    WHERE geom IS NOT NULL;

    RETURN mvt;
END;
$$;
