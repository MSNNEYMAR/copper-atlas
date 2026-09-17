/**
 * Copper Atlas — Frontend Type Definitions
 * 全球铜矿床图谱 — 前端类型定义
 *
 * Mirrors the backend Pydantic schemas.
 * Auto-generated from OpenAPI spec in production; hand-maintained during Phase 1.
 */

// ============================================================================
// GeoJSON Core Types
// ============================================================================

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number] | null;
}

export interface GeoJsonFeature<P = DepositProperties> {
  type: 'Feature';
  id: string;
  geometry: GeoJsonPoint;
  properties: P;
}

export interface GeoJsonFeatureCollection<P = DepositProperties> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<P>[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================================
// Deposit Properties
// ============================================================================

export interface DepositProperties {
  name: string;
  name_zh: string | null;
  slug: string;
  primary_mineral: string;
  secondary_minerals: string[] | null;
  deposit_type_code: string | null;
  deposit_type_name_en: string | null;
  deposit_type_name_zh: string | null;
  deposit_type_path: string | null;
  status: DepositStatus;
  country_iso: string | null;
  country_name_en: string | null;
  country_name_zh: string | null;
  state_province: string | null;
  tonnage_mt: number | null;
  tonnage_grade_pct: number | null;
  tonnage_confidence: string | null;
  discovery_year: number | null;
  operator_company: string | null;
  mining_method: string | null;
  host_rock_age_text: string | null;
  tectonic_setting: string | null;
  geological_province: string | null;
  data_quality_score: number | null;
  is_featured: boolean;
  data_source: string | null;
  tags: string[] | null;
}

export interface DepositDetailProperties extends DepositProperties {
  alternative_names: string[] | null;
  longitude: number | null;
  latitude: number | null;
  elevation_m: number | null;
  source_srid: number;
  tonnage_mt_low: number | null;
  tonnage_mt_high: number | null;
  tonnage_cutoff_pct: number | null;
  proven_mt: number | null;
  probable_mt: number | null;
  measured_mt: number | null;
  indicated_mt: number | null;
  inferred_mt: number | null;
  production_start_year: number | null;
  production_end_year: number | null;
  owner_companies: string[] | null;
  mineralization_age_ma: number | null;
  mineralization_age_error_ma: number | null;
  mineralization_age_method: string | null;
  host_rock_type: string | null;
  metallogenic_belt: string | null;
  summary_en: string | null;
  summary_zh: string | null;
  geology_en: string | null;
  geology_zh: string | null;
  reference_dois: string[] | null;
  data_source_url: string | null;
  last_verified_date: string | null;
  images: string[] | null;
  documents: string[] | null;
  properties: Record<string, unknown>;
}

export type DepositStatus =
  | 'exploration'
  | 'feasibility'
  | 'development'
  | 'production'
  | 'suspended'
  | 'closed'
  | 'depleted'
  | 'unknown';

// ============================================================================
// Statistics Types
// ============================================================================

export interface StatsSummary {
  total_deposits: number;
  total_tonnage_mt: number | null;
  avg_grade_pct: number | null;
  countries_count: number;
  producing_count: number;
  largest_deposit: { name: string; slug: string; tonnage_mt: number } | null;
  highest_grade_deposit: { name: string; slug: string; grade_pct: number } | null;
}

export interface StatsByCountry {
  deposit_count: number;
  total_tonnage: string;
  avg_grade: string | null;
  iso_code: string;
  name_en: string;
  name_zh: string;
}

export interface StatsByType {
  code: string;
  name_en: string;
  name_zh: string;
  count: number;
  total_tonnage: string | null;
  avg_grade: string | null;
}

export interface StatsByStatus {
  status: string;
  count: number;
  total_tonnage: string | null;
}

export interface StatsDistribution {
  bucket: number;
  count: number;
  range_min: number;
  range_max: number;
}

// ============================================================================
// Reference Data Types
// ============================================================================

export interface CountryInfo {
  iso_code: string;
  iso_code_3: string;
  name_en: string;
  name_zh: string;
  continent: string;
  deposit_count: number;
  total_tonnage_mt: number | null;
}

export interface ClassificationNode {
  code: string;
  path: string;
  name_en: string;
  name_zh: string;
  parent_code: string | null;
  depth: number;
  description_en: string | null;
  tectonic_setting: string | null;
  sort_order: number;
}

export interface TimeScaleUnit {
  id: string;
  name_en: string;
  name_zh: string;
  rank_en: string;
  rank_zh: string;
  base_age_ma: number;
  top_age_ma: number;
  path: string;
  color_hex: string | null;
}

export interface StatusInfo {
  value: string;
  label_en: string;
  label_zh: string;
}

export interface MineralInfo {
  mineral_code: string;
  chemical_symbol: string;
  enabled: boolean;
  phase: number;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  primary_mineral: string;
  status: string;
  tonnage_mt: number | null;
  country_iso: string;
  country_name_en: string;
  classification_name_en: string;
  relevance: number;
}

export interface CoordinateTransformResult {
  from_srid: number;
  to_srid: number;
  input: { longitude: number; latitude: number };
  output: { x: number; y: number };
}
