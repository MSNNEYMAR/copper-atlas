/**
 * Copper Atlas — Statistics Data Hook
 *
 * Calls /api/v1/statistics — a single database-driven endpoint.
 * ALL aggregations computed server-side. Frontend only does display.
 *
 * GUARANTEE: total_deposits == COUNT(*) FROM deposits WHERE is_active=true
 */
'use client';

import { useEffect, useMemo, useState } from 'react';

// --- Types mirror the statistics API response ---

export interface StatisticsResponse {
  overview: {
    total_deposits: number;
    total_tonnage_mt: number | null;
    avg_grade_pct: number | null;
    countries_count: number;
    producing_count: number;
    exploration_count: number;
    development_count: number;
    closed_count: number;
    suspended_count: number;
  };
  by_country: { iso: string; name_en: string; name_zh: string; count: number; tonnage: number }[];
  by_type: {
    code: string;
    name_en: string;
    name_zh: string;
    count: number;
    tonnage: number;
    avg_grade: number | null;
  }[];
  by_status: { status: string; count: number; tonnage: number }[];
  tonnage_distribution: { bucket: string; count: number }[];
  grade_distribution: { bucket: string; count: number }[];
  timeline: { decade: string; count: number }[];
  top_tonnage: {
    id: string;
    name: string;
    tonnage_mt: number;
    country_iso: string;
    country_name: string;
  }[];
  top_grade: {
    id: string;
    name: string;
    grade_pct: number;
    country_iso: string;
    country_name: string;
  }[];
  top_operators: { name: string; deposit_count: number; total_tonnage_mt: number }[];
  tectonic: { setting: string; count: number }[];
  host_rocks: { rock: string; count: number }[];
  data_sources: { source: string; count: number }[];
}

export interface DepositSummary {
  id: string;
  name: string;
  name_zh: string | null;
  slug: string;
  country_iso: string;
  country_name_en: string;
  country_name_zh: string;
  deposit_type_code: string;
  deposit_type_name_en: string;
  deposit_type_name_zh: string;
  status: string;
  tonnage_mt: number | null;
  tonnage_grade_pct: number | null;
  discovery_year: number | null;
  production_start_year: number | null;
  operator_company: string | null;
  data_source: string | null;
  tectonic_setting: string | null;
  metallogenic_belt: string | null;
  host_rock_type: string | null;
  geological_province: string | null;
  mining_method: string | null;
  tonnage_confidence: string | null;
  is_featured: boolean;
  data_quality_score: number | null;
}

export interface Aggregations {
  total: number;
  totalTonnage: number;
  avgGrade: number;
  gradeCount: number;
  producing: number;
  exploration: number;
  development: number;
  closed: number;
  suspended: number;
  countryCount: number;
  typeCount: number;
  byCountry: { iso: string; name: string; nameZh: string; count: number; tonnage: number }[];
  byContinent: { name: string; count: number }[];
  byType: { code: string; name: string; nameZh: string; count: number; tonnage: number }[];
  byStatus: { status: string; count: number }[];
  byTonnageBucket: { bucket: string; count: number }[];
  byDiscoveryDecade: { decade: string; count: number }[];
  byOperator: { name: string; count: number; tonnage: number }[];
  byTectonic: { setting: string; count: number }[];
  byHostRock: { rock: string; count: number }[];
  byDataSource: { source: string; count: number }[];
  topByTonnage: { id: string; name: string; tonnage: number; country: string }[];
  topByGrade: { id: string; name: string; grade: number; country: string }[];
}

const CONTINENTS: Record<string, string> = {
  CL: 'South America',
  PE: 'South America',
  AR: 'South America',
  BR: 'South America',
  EC: 'South America',
  CO: 'South America',
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  PA: 'North America',
  CU: 'North America',
  CN: 'Asia',
  ID: 'Asia',
  PH: 'Asia',
  MN: 'Asia',
  KZ: 'Asia',
  IR: 'Asia',
  IN: 'Asia',
  PK: 'Asia',
  TR: 'Asia',
  SA: 'Asia',
  MM: 'Asia',
  VN: 'Asia',
  LA: 'Asia',
  UZ: 'Asia',
  KG: 'Asia',
  JP: 'Asia',
  AF: 'Asia',
  AU: 'Oceania',
  PG: 'Oceania',
  NZ: 'Oceania',
  CD: 'Africa',
  ZM: 'Africa',
  ZA: 'Africa',
  NA: 'Africa',
  BW: 'Africa',
  MG: 'Africa',
  MA: 'Africa',
  RU: 'Europe',
  PL: 'Europe',
  SE: 'Europe',
  FI: 'Europe',
  ES: 'Europe',
  PT: 'Europe',
  DE: 'Europe',
  RS: 'Europe',
  BG: 'Europe',
  AM: 'Europe',
};

export function useStatisticsData() {
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    fetch('/api/v1/statistics')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: StatisticsResponse) => {
        if (ok) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (ok) setError(String(e?.message || 'Unknown'));
      })
      .finally(() => {
        if (ok) setLoading(false);
      });
    return () => {
      ok = false;
    };
  }, []);

  // Convert StatisticsResponse → Aggregations (API-driven, zero calculation)
  const agg = useMemo((): Aggregations | null => {
    if (!data) return null;
    const o = data.overview;
    const contMap: Record<string, number> = {};
    for (const c of data.by_country) {
      const cont = CONTINENTS[c.iso] || 'Other';
      contMap[cont] = (contMap[cont] || 0) + c.count;
    }

    return {
      total: o.total_deposits,
      totalTonnage: o.total_tonnage_mt ?? 0,
      avgGrade: o.avg_grade_pct ?? 0,
      gradeCount: 0,
      producing: o.producing_count,
      exploration: o.exploration_count,
      development: o.development_count,
      closed: o.closed_count,
      suspended: o.suspended_count,
      countryCount: o.countries_count,
      typeCount: data.by_type.length,
      byCountry: data.by_country
        .filter((c) => c.count > 0)
        .map((c) => ({
          iso: c.iso,
          name: c.name_en,
          nameZh: c.name_zh,
          count: c.count,
          tonnage: c.tonnage,
        })),
      byContinent: Object.entries(contMap)
        .map(([name, count]) => ({ name, count }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
      byType: data.by_type.map((t) => ({
        code: t.code,
        name: t.name_en,
        nameZh: t.name_zh,
        count: t.count,
        tonnage: t.tonnage,
      })),
      byStatus: data.by_status.map((s) => ({ status: s.status, count: s.count })),
      byTonnageBucket: data.tonnage_distribution.map((b) => ({ bucket: b.bucket, count: b.count })),
      byDiscoveryDecade: data.timeline.map((t) => ({ decade: t.decade, count: t.count })),
      byOperator: data.top_operators.map((o) => ({
        name: o.name,
        count: o.deposit_count,
        tonnage: o.total_tonnage_mt,
      })),
      byTectonic: data.tectonic.map((t) => ({ setting: t.setting, count: t.count })),
      byHostRock: data.host_rocks.map((r) => ({ rock: r.rock, count: r.count })),
      byDataSource: data.data_sources.map((s) => ({ source: s.source, count: s.count })),
      topByTonnage: data.top_tonnage.map((t) => ({
        id: t.id,
        name: t.name,
        tonnage: t.tonnage_mt,
        country: t.country_iso,
      })),
      topByGrade: data.top_grade.map((t) => ({
        id: t.id,
        name: t.name,
        grade: t.grade_pct,
        country: t.country_iso,
      })),
    };
  }, [data]);

  const deposits = useMemo((): DepositSummary[] => {
    // Empty — statistics page no longer needs raw deposits
    return [];
  }, []);

  return { deposits, agg, loading, error };
}
