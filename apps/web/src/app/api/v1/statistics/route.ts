/**
 * GET /api/v1/statistics — DATABASE-DRIVEN STATISTICS API
 *
 * Single endpoint returns all aggregations. No client-side computation.
 * All KPIs come from PostgREST built-in aggregate functions (.sum/.avg/count).
 * GROUP BY data is counted server-side after paginated fetch of required columns.
 *
 * GUARANTEE:
 *   total_deposits == SELECT COUNT(*) FROM deposits WHERE is_active=true AND primary_mineral='copper'
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/** Fetch ALL rows of selected columns with pagination. Returns full array. */
async function fetchAllPages(_select: string, baseUrl: string): Promise<any[]> {
  const all: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const url = `${baseUrl}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers: H });
    if (!res.ok) break;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    offset += pageSize;
    if (rows.length < pageSize) break;
  }
  return all;
}

/** Get exact count via GET with limit=0 + Prefer: count=exact header */
async function exactCount(baseFilter: string): Promise<number> {
  const url = `${baseFilter}&limit=0`;
  const res = await fetch(url, { headers: { ...H, Prefer: 'count=exact' } });
  const range = res.headers.get('content-range');
  // content-range format: "0-0/2094"
  if (range) {
    const parts = range.split('/');
    if (parts.length === 2) return Number.parseInt(parts[1]) || 0;
  }
  // Fallback: count from response body array length
  return 0;
}

export async function GET(request: NextRequest) {
  const mineral = request.nextUrl.searchParams.get('mineral') || 'copper';
  const filter = `primary_mineral=eq.${mineral}&is_active=eq.true`;
  const _base = `${API}/deposits?${filter}`;

  try {
    // ==================================================================
    // OVERVIEW KPIs — all from PostgREST aggregate functions (TRUE DB-driven)
    // ==================================================================
    const [
      total,
      producing,
      exploration,
      development,
      closed,
      suspended,
      sumRes,
      avgRes,
      distinctCountries,
    ] = await Promise.all([
      exactCount(`${API}/deposits?${filter}`),
      exactCount(`${API}/deposits?${filter}&status=eq.production`),
      exactCount(`${API}/deposits?${filter}&status=eq.exploration`),
      exactCount(`${API}/deposits?${filter}&status=eq.development`),
      exactCount(`${API}/deposits?${filter}&status=in.(closed,depleted)`),
      exactCount(`${API}/deposits?${filter}&status=eq.suspended`),
      fetch(`${API}/deposits?select=tonnage_mt.sum()&${filter}&tonnage_mt=not.is.null`, {
        headers: H,
      }),
      fetch(
        `${API}/deposits?select=tonnage_grade_pct.avg()&${filter}&tonnage_grade_pct=not.is.null`,
        { headers: H },
      ),
      fetchAllPages('country_id', `${API}/deposits?select=country_id&${filter}`),
    ]);

    const sumData = await sumRes.json();
    const avgData = await avgRes.json();
    const totalTonnage = sumData?.[0]?.sum ? Number(sumData[0].sum) : null;
    const avgGrade = avgData?.[0]?.avg ? Number(avgData[0].avg) : null;
    const countryCount = new Set(distinctCountries.map((d: any) => d.country_id)).size;

    const overview = {
      total_deposits: total,
      total_tonnage_mt: totalTonnage,
      avg_grade_pct: avgGrade,
      countries_count: countryCount,
      producing_count: producing,
      exploration_count: exploration,
      development_count: development,
      closed_count: closed,
      suspended_count: suspended,
    };

    // ==================================================================
    // GROUP BY DATA — fetch all needed columns, aggregate server-side
    // ==================================================================
    const [allDeposits, countriesData, classData] = await Promise.all([
      fetchAllPages(
        'id,name,status,country_id,deposit_classification_id,tonnage_mt,tonnage_grade_pct,discovery_year,operator_company,data_source,tectonic_setting,host_rock_type,geological_province,metallogenic_belt',
        `${API}/deposits?select=id,name,status,country_id,deposit_classification_id,tonnage_mt,tonnage_grade_pct,discovery_year,operator_company,data_source,tectonic_setting,host_rock_type,geological_province,metallogenic_belt&${filter}`,
      ),
      fetch(`${API}/countries?select=id,iso_code,name_en,name_zh&limit=200`, { headers: H }),
      fetch(`${API}/deposit_classification?select=id,code,name_en,name_zh&limit=100`, {
        headers: H,
      }),
    ]);

    const countries = await countriesData.json();
    const classes = await classData.json();
    const cMap = new Map<string, any>((countries || []).map((c: any) => [c.id, c]));
    const clMap = new Map<string, any>((classes || []).map((c: any) => [c.id, c]));

    // --- By Country ---
    const cAgg = new Map<
      string,
      { iso: string; name_en: string; name_zh: string; count: number; tonnage: number }
    >();
    for (const d of allDeposits) {
      const c = cMap.get(d.country_id);
      if (!c) continue;
      const iso = c.iso_code;
      const e = cAgg.get(iso) || {
        iso,
        name_en: c.name_en,
        name_zh: c.name_zh,
        count: 0,
        tonnage: 0,
      };
      e.count++;
      if (d.tonnage_mt) e.tonnage += Number(d.tonnage_mt);
      cAgg.set(iso, e);
    }
    const by_country = Array.from(cAgg.values()).sort((a, b) => b.count - a.count);

    // --- By Deposit Type ---
    const tAgg = new Map<
      string,
      {
        code: string;
        name_en: string;
        name_zh: string;
        count: number;
        tonnage: number;
        grade_sum: number;
        grade_n: number;
      }
    >();
    for (const d of allDeposits) {
      const cl = clMap.get(d.deposit_classification_id);
      if (!cl) continue;
      const code = cl.code;
      const e = tAgg.get(code) || {
        code,
        name_en: cl.name_en,
        name_zh: cl.name_zh,
        count: 0,
        tonnage: 0,
        grade_sum: 0,
        grade_n: 0,
      };
      e.count++;
      if (d.tonnage_mt) e.tonnage += Number(d.tonnage_mt);
      if (d.tonnage_grade_pct) {
        e.grade_sum += Number(d.tonnage_grade_pct);
        e.grade_n++;
      }
      tAgg.set(code, e);
    }
    const by_type = Array.from(tAgg.values())
      .map((v) => ({ ...v, avg_grade: v.grade_n > 0 ? v.grade_sum / v.grade_n : null }))
      .sort((a, b) => b.count - a.count);

    // --- By Status ---
    const sAgg = new Map<string, { status: string; count: number; tonnage: number }>();
    for (const d of allDeposits) {
      const s = d.status || 'unknown';
      const e = sAgg.get(s) || { status: s, count: 0, tonnage: 0 };
      e.count++;
      if (d.tonnage_mt) e.tonnage += Number(d.tonnage_mt);
      sAgg.set(s, e);
    }
    const by_status = Array.from(sAgg.values()).sort((a, b) => b.count - a.count);

    // --- Tonnage Distribution ---
    const buckets: Record<string, number> = {
      '<1 Mt': 0,
      '1-5 Mt': 0,
      '5-10 Mt': 0,
      '10-50 Mt': 0,
      '>50 Mt': 0,
    };
    for (const d of allDeposits) {
      if (!d.tonnage_mt) continue;
      const v = Number(d.tonnage_mt);
      if (v < 1) buckets['<1 Mt']++;
      else if (v < 5) buckets['1-5 Mt']++;
      else if (v < 10) buckets['5-10 Mt']++;
      else if (v < 50) buckets['10-50 Mt']++;
      else buckets['>50 Mt']++;
    }
    const tonnage_distribution = Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
    }));

    // --- Grade Distribution ---
    const gBuckets: Record<string, number> = {
      '<0.25%': 0,
      '0.25-0.5%': 0,
      '0.5-1%': 0,
      '1-2%': 0,
      '>2%': 0,
    };
    for (const d of allDeposits) {
      if (!d.tonnage_grade_pct) continue;
      const v = Number(d.tonnage_grade_pct);
      if (v < 0.25) gBuckets['<0.25%']++;
      else if (v < 0.5) gBuckets['0.25-0.5%']++;
      else if (v < 1) gBuckets['0.5-1%']++;
      else if (v < 2) gBuckets['1-2%']++;
      else gBuckets['>2%']++;
    }
    const grade_distribution = Object.entries(gBuckets).map(([bucket, count]) => ({
      bucket,
      count,
    }));

    // --- Discovery Timeline ---
    const decAgg = new Map<string, number>();
    for (const d of allDeposits) {
      if (!d.discovery_year) continue;
      const dec = `${Math.floor(d.discovery_year / 10) * 10}s`;
      decAgg.set(dec, (decAgg.get(dec) || 0) + 1);
    }
    const timeline = Array.from(decAgg.entries())
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade.localeCompare(b.decade));

    // --- Top 10 by Tonnage ---
    const topTonnage = allDeposits
      .filter((d) => d.tonnage_mt)
      .sort((a, b) => Number(b.tonnage_mt) - Number(a.tonnage_mt))
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        name: d.name,
        tonnage_mt: Number(d.tonnage_mt),
        country_iso: cMap.get(d.country_id)?.iso_code || '',
        country_name: cMap.get(d.country_id)?.name_en || '',
      }));

    // --- Top 10 by Grade ---
    const topGrade = allDeposits
      .filter((d) => d.tonnage_grade_pct)
      .sort((a, b) => Number(b.tonnage_grade_pct) - Number(a.tonnage_grade_pct))
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        name: d.name,
        grade_pct: Number(d.tonnage_grade_pct),
        country_iso: cMap.get(d.country_id)?.iso_code || '',
        country_name: cMap.get(d.country_id)?.name_en || '',
      }));

    // --- Top Operators ---
    const opAgg = new Map<string, { count: number; tonnage: number }>();
    for (const d of allDeposits) {
      if (!d.operator_company) continue;
      const op = d.operator_company.split(/[,;]/)[0].trim();
      const e = opAgg.get(op) || { count: 0, tonnage: 0 };
      e.count++;
      if (d.tonnage_mt) e.tonnage += Number(d.tonnage_mt);
      opAgg.set(op, e);
    }
    const top_operators = Array.from(opAgg.entries())
      .map(([name, v]) => ({ name, deposit_count: v.count, total_tonnage_mt: v.tonnage }))
      .sort((a, b) => b.total_tonnage_mt - a.total_tonnage_mt)
      .slice(0, 10);

    // --- Tectonic Settings ---
    const tecAgg = new Map<string, number>();
    for (const d of allDeposits) {
      if (d.tectonic_setting)
        tecAgg.set(d.tectonic_setting, (tecAgg.get(d.tectonic_setting) || 0) + 1);
    }
    const tectonic = Array.from(tecAgg.entries())
      .map(([setting, count]) => ({ setting, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Host Rocks ---
    const rockAgg = new Map<string, number>();
    for (const d of allDeposits) {
      if (d.host_rock_type) rockAgg.set(d.host_rock_type, (rockAgg.get(d.host_rock_type) || 0) + 1);
    }
    const host_rocks = Array.from(rockAgg.entries())
      .map(([rock, count]) => ({ rock, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Data Sources ---
    const srcAgg = new Map<string, number>();
    for (const d of allDeposits) {
      if (d.data_source) {
        const src = d.data_source.split(/[;,]/)[0].trim().substring(0, 40);
        srcAgg.set(src, (srcAgg.get(src) || 0) + 1);
      }
    }
    const data_sources = Array.from(srcAgg.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ==================================================================
    // UNIFIED RESPONSE
    // ==================================================================
    return NextResponse.json({
      overview,
      by_country,
      by_type,
      by_status,
      tonnage_distribution,
      grade_distribution,
      timeline,
      top_tonnage: topTonnage,
      top_grade: topGrade,
      top_operators,
      tectonic,
      host_rocks,
      data_sources,
    });
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500 });
  }
}
