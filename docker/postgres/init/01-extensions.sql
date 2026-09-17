-- ============================================================================
-- Copper Atlas — Extensions Setup
-- 全局铜矿床图谱 — 数据库扩展
-- ============================================================================
-- PostgreSQL 16 + PostGIS 3.4
-- All extensions required by the platform are registered here.
-- ============================================================================

-- Spatial extension: geometry types, spatial indexes, spatial functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Topology extension: for spatial relationship validation
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Hierarchical tree types for deposit classification and geological time scale
CREATE EXTENSION IF NOT EXISTS ltree;

-- Trigram fuzzy text search: enables accent-insensitive and fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Accent removal: essential for multilingual text search (e.g., "Chuquicamata" vs "Chuquicamata")
CREATE EXTENSION IF NOT EXISTS unaccent;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Range types for grade and tonnage intervals
-- (built into PostgreSQL 14+, no separate extension needed but documented here)
-- NUMRANGE, INT4RANGE, TSRANGE are used throughout the schema
