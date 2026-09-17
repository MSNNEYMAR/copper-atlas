-- ============================================================================
-- Copper Atlas — Seed v0.1: 100 Representative Global Copper Deposits
-- 全球铜矿床图谱 — 种子数据 v0.1
--
-- INSERT strategy:
--   1. Insert countries (ON CONFLICT DO NOTHING for existing)
--   2. Insert deposit classifications (already exist from Phase 1)
--   3. INSERT deposits with subqueries for country_id and classification_id
--   4. Uses Python script for bulk execution via Supabase API
--
-- Run: python scripts/import_seed_v2.py
-- Source: 100 deposits from USGS MRDS, company reports, academic papers
-- ============================================================================

-- Ensure prerequisite tables have data
-- Countries are populated from seed_v1 (43 countries already in DB)
-- Deposit classifications are populated from seed_v1 (23 entries)

-- ============================================================================
-- NOTE: This SQL is a template. The actual INSERT is executed by
-- scripts/import_seed_v2.py which reads seed.csv and constructs
-- parameterized INSERT statements. This avoids SQL parsing issues
-- with single quotes, array syntax, and UUID subqueries.
--
-- SQL executed per deposit:
-- INSERT INTO deposits (slug, name, ...)
-- SELECT 'chuquicamata', 'Chuquicamata', ...,
--        (SELECT id FROM countries WHERE iso_code = 'CL'),
--        (SELECT id FROM deposit_classification WHERE code = 'POR_CUMO')
-- WHERE NOT EXISTS (SELECT 1 FROM deposits WHERE slug = 'chuquicamata');
-- ============================================================================

-- Verification queries after import:

-- Count by country:
-- SELECT c.name_en, COUNT(*) FROM deposits d
-- JOIN countries c ON d.country_id = c.id
-- GROUP BY c.name_en ORDER BY COUNT(*) DESC;

-- Count by type:
-- SELECT dc.name_en, COUNT(*) FROM deposits d
-- JOIN deposit_classification dc ON d.deposit_classification_id = dc.id
-- GROUP BY dc.name_en ORDER BY COUNT(*) DESC;

-- Count by status:
-- SELECT status, COUNT(*) FROM deposits GROUP BY status ORDER BY COUNT(*) DESC;

-- Top 20 by tonnage:
-- SELECT slug, name, tonnage_mt, tonnage_grade_pct, status
-- FROM deposits ORDER BY tonnage_mt DESC NULLS LAST LIMIT 20;
