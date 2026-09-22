import {
  atlasDeposits,
  findClassification,
  findCountry,
  type AtlasDeposit,
} from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

export async function GET(request: NextRequest) {
  const mineral = request.nextUrl.searchParams.get('mineral') || 'copper';
  const rows = atlasDeposits.filter((deposit) => deposit.primaryMineral === mineral);
  const tonnages = rows.map((deposit) => deposit.tonnageMt).filter((value): value is number => value !== null);
  const grades = rows.map((deposit) => deposit.tonnageGradePct).filter((value): value is number => value !== null);
  const statusCount = (statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).length;

  const countryStats = new Map<string, { count: number; tonnage: number }>();
  const typeStats = new Map<string, { count: number; tonnage: number }>();
  const statusStats = new Map<string, number>();
  const operatorStats = new Map<string, { count: number; tonnage: number }>();
  const tectonicStats = new Map<string, number>();
  const rockStats = new Map<string, number>();
  const sourceStats = new Map<string, number>();

  for (const deposit of rows) {
    const country = countryStats.get(deposit.countryIso) || { count: 0, tonnage: 0 };
    country.count += 1;
    country.tonnage += deposit.tonnageMt || 0;
    countryStats.set(deposit.countryIso, country);

    const typeCode = deposit.depositTypeCode || 'OTH';
    const type = typeStats.get(typeCode) || { count: 0, tonnage: 0 };
    type.count += 1;
    type.tonnage += deposit.tonnageMt || 0;
    typeStats.set(typeCode, type);

    increment(statusStats, deposit.status);

    if (deposit.operatorCompany) {
      const operator = deposit.operatorCompany.split(/[,;]/)[0].trim();
      const current = operatorStats.get(operator) || { count: 0, tonnage: 0 };
      current.count += 1;
      current.tonnage += deposit.tonnageMt || 0;
      operatorStats.set(operator, current);
    }
    if (deposit.tectonicSetting) increment(tectonicStats, deposit.tectonicSetting);
    if (deposit.hostRockType) increment(rockStats, deposit.hostRockType);
    if (deposit.dataSource) increment(sourceStats, deposit.dataSource.split(/[;,]/)[0].trim().slice(0, 40));
  }

  const countryRows = Array.from(countryStats.entries())
    .map(([iso, value]) => {
      const country = findCountry(iso);
      return {
        iso,
        name_en: country?.name_en || iso,
        name_zh: country?.name_zh || iso,
        count: value.count,
        tonnage: value.tonnage,
      };
    })
    .sort((a, b) => b.count - a.count || b.tonnage - a.tonnage);

  const typeRows = Array.from(typeStats.entries())
    .map(([code, value]) => {
      const type = findClassification(code);
      return {
        code,
        name_en: type?.name_en || code,
        name_zh: type?.name_zh || code,
        count: value.count,
        tonnage: value.tonnage,
      };
    })
    .sort((a, b) => b.count - a.count || b.tonnage - a.tonnage);

  const tonnageBuckets: Record<string, number> = {
    '<1 Mt': 0,
    '1-5 Mt': 0,
    '5-10 Mt': 0,
    '10-50 Mt': 0,
    '>50 Mt': 0,
  };
  for (const value of tonnages) {
    if (value < 1) tonnageBuckets['<1 Mt']++;
    else if (value < 5) tonnageBuckets['1-5 Mt']++;
    else if (value < 10) tonnageBuckets['5-10 Mt']++;
    else if (value < 50) tonnageBuckets['10-50 Mt']++;
    else tonnageBuckets['>50 Mt']++;
  }

  const gradeBuckets: Record<string, number> = {
    '<0.25%': 0,
    '0.25-0.5%': 0,
    '0.5-1%': 0,
    '1-2%': 0,
    '>2%': 0,
  };
  for (const value of grades) {
    if (value < 0.25) gradeBuckets['<0.25%']++;
    else if (value < 0.5) gradeBuckets['0.25-0.5%']++;
    else if (value < 1) gradeBuckets['0.5-1%']++;
    else if (value < 2) gradeBuckets['1-2%']++;
    else gradeBuckets['>2%']++;
  }

  const decades = new Map<string, number>();
  for (const row of rows) {
    if (row.discoveryYear !== null) increment(decades, `${Math.floor(row.discoveryYear / 10) * 10}s`);
  }

  const topTonnage = [...rows]
    .filter((row): row is AtlasDeposit & { tonnageMt: number } => row.tonnageMt !== null)
    .sort((a, b) => b.tonnageMt - a.tonnageMt)
    .slice(0, 10)
    .map((row) => ({
      id: row.slug,
      name: row.name,
      tonnage_mt: row.tonnageMt,
      country_iso: row.countryIso,
      country_name: findCountry(row.countryIso)?.name_en || row.countryIso,
    }));

  const topGrade = [...rows]
    .filter((row): row is AtlasDeposit & { tonnageGradePct: number } => row.tonnageGradePct !== null)
    .sort((a, b) => b.tonnageGradePct - a.tonnageGradePct)
    .slice(0, 10)
    .map((row) => ({
      id: row.slug,
      name: row.name,
      grade_pct: row.tonnageGradePct,
      country_iso: row.countryIso,
      country_name: findCountry(row.countryIso)?.name_en || row.countryIso,
    }));

  return NextResponse.json({
    overview: {
      total_deposits: rows.length,
      total_tonnage_mt: tonnages.length ? tonnages.reduce((sum, value) => sum + value, 0) : null,
      avg_grade_pct: average(grades),
      countries_count: countryStats.size,
      producing_count: statusCount(['production']),
      exploration_count: statusCount(['exploration', 'feasibility']),
      development_count: statusCount(['development']),
      closed_count: statusCount(['closed', 'depleted']),
      suspended_count: statusCount(['suspended']),
    },
    by_country: countryRows,
    by_type: typeRows,
    by_status: Array.from(statusStats.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    tonnage_distribution: Object.entries(tonnageBuckets).map(([bucket, count]) => ({ bucket, count })),
    grade_distribution: Object.entries(gradeBuckets).map(([bucket, count]) => ({ bucket, count })),
    timeline: Array.from(decades.entries())
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade.localeCompare(b.decade)),
    top_tonnage: topTonnage,
    top_grade: topGrade,
    top_operators: Array.from(operatorStats.entries())
      .map(([name, value]) => ({
        name,
        deposit_count: value.count,
        total_tonnage_mt: value.tonnage,
      }))
      .sort((a, b) => b.total_tonnage_mt - a.total_tonnage_mt)
      .slice(0, 10),
    tectonic: Array.from(tectonicStats.entries())
      .map(([setting, count]) => ({ setting, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    host_rocks: Array.from(rockStats.entries())
      .map(([rock, count]) => ({ rock, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    data_sources: Array.from(sourceStats.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  });
}
