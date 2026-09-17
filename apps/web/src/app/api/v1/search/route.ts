/**
 * GET /api/v1/search — SQL-powered search via Supabase Management API
 *
 * Uses raw SQL for reliable Chinese/UTF-8 search.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

function sc(s: string): string {
  return s.replace(/'/g, "''");
}
function esc(s: string): string {
  return s.replace(/['\\]/g, '');
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get('q')?.trim();
  const mineral = params.get('mineral') || 'copper';
  const limit = Math.min(Number.parseInt(params.get('limit') || '15'), 50);

  if (!q || q.length < 1) return NextResponse.json({ results: [], query: q });

  const _qs = sc(q);
  const _results: any[] = [];
  const _seen = new Set<string>();

  try {
    // FETCH ALL deposits in one shot (~100 rows, fast). Filter + rank in JS.
    // This is THE most reliable approach — no PostgREST encoding issues.
    const allUrl =
      `${API}/deposits?select=id,name,name_zh,slug,primary_mineral,status,tonnage_mt,tonnage_grade_pct,country_id,deposit_classification_id,tags,operator_company,host_rock_type,tectonic_setting,geological_province,metallogenic_belt,state_province` +
      `&primary_mineral=eq.${mineral}&is_active=eq.true&order=tonnage_mt.desc.nullslast&limit=500`;

    const [allRes, countriesRes, classesRes] = await Promise.all([
      fetch(allUrl, { headers: H }),
      fetch(`${API}/countries?select=id,iso_code,name_en,name_zh&limit=200`, { headers: H }),
      fetch(`${API}/deposit_classification?select=id,code,name_en,name_zh&limit=100`, {
        headers: H,
      }),
    ]);

    const deposits = await allRes.json();
    const countries = await countriesRes.json();
    const classes = await classesRes.json();
    const countryMap = new Map<string, any>((countries || []).map((c: any) => [c.id, c]));
    const classMap = new Map<string, any>((classes || []).map((c: any) => [c.id, c]));

    if (!Array.isArray(deposits)) return NextResponse.json({ results: [], query: q });

    const lower = q.toLowerCase();

    // Score every deposit against the query
    const scored = deposits.map((d: any) => {
      let score = 0;
      let source = 'none';

      // Name (EN)
      if ((d.name || '').toLowerCase().includes(lower)) {
        score = Math.max(score, (d.name || '').toLowerCase().startsWith(lower) ? 100 : 80);
        source = 'deposit_name';
      }
      // Name (ZH)
      if ((d.name_zh || '').includes(q)) {
        score = Math.max(score, (d.name_zh || '').startsWith(q) ? 100 : 80);
        source = 'deposit_name';
      }
      // Slug
      if ((d.slug || '').toLowerCase().includes(lower)) {
        score = Math.max(score, 70);
        if (source === 'none') source = 'deposit_name';
      }

      // Country match
      const c = countryMap.get(d.country_id);
      if (c) {
        if ((c.name_en || '').toLowerCase().includes(lower)) {
          score = Math.max(score, 90);
          source = 'country_match';
        }
        if ((c.name_zh || '').includes(q)) {
          score = Math.max(score, 90);
          source = 'country_match';
        }
        if ((c.iso_code || '').toLowerCase() === lower) {
          score = Math.max(score, 95);
          source = 'country_match';
        }
      }

      // Classification match
      const cl = classMap.get(d.deposit_classification_id);
      if (cl) {
        if ((cl.name_en || '').toLowerCase().includes(lower)) {
          score = Math.max(score, 85);
          source = source === 'none' ? 'classification_match' : source;
        }
        if ((cl.name_zh || '').includes(q)) {
          score = Math.max(score, 85);
          source = source === 'none' ? 'classification_match' : source;
        }
        if ((cl.code || '').toLowerCase().includes(lower)) {
          score = Math.max(score, 75);
          source = source === 'none' ? 'classification_match' : source;
        }
      }

      // Deep fields
      const deep = [
        d.operator_company,
        d.host_rock_type,
        d.tectonic_setting,
        d.geological_province,
        d.metallogenic_belt,
        d.state_province,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (deep.includes(lower)) {
        score = Math.max(score, 60);
        if (source === 'none') source = 'deep_field';
      }

      // Tags
      if (Array.isArray(d.tags)) {
        const tagStr = d.tags.join(' ').toLowerCase();
        if (tagStr.includes(lower)) {
          score = Math.max(score, 55);
          if (source === 'none') source = 'deep_field';
        }
      }

      // Fuzzy fallback for longer queries
      if (score === 0 && q.length >= 3) {
        const name = (d.name || '').toLowerCase();
        let matchCount = 0;
        for (let i = 0; i < lower.length; i++) {
          if (name.includes(lower[i])) matchCount++;
        }
        if (matchCount > lower.length * 0.5) {
          score = 15;
          source = 'fuzzy';
        }
      }

      return { ...d, _score: score, _source: source };
    });

    const filtered = scored
      .filter((d: any) => d._score > 0)
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, limit);

    const enriched = filtered.map((d: any) => {
      const country = countryMap.get(d.country_id);
      const cls = classMap.get(d.deposit_classification_id);
      return {
        id: d.id,
        name: d.name,
        name_zh: d.name_zh || null,
        slug: d.slug,
        primary_mineral: d.primary_mineral,
        status: d.status,
        tonnage_mt: d.tonnage_mt ? Number(d.tonnage_mt) : null,
        tonnage_grade_pct: d.tonnage_grade_pct ? Number(d.tonnage_grade_pct) : null,
        country_iso: country?.iso_code || null,
        country_name_en: country?.name_en || null,
        country_name_zh: country?.name_zh || null,
        classification_name_en: cls?.name_en || null,
        classification_name_zh: cls?.name_zh || null,
        classification_code: cls?.code || null,
        source: d._source,
        score: d._score,
      };
    });

    return NextResponse.json({ results: enriched, query: q, total: enriched.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message }, results: [], query: q },
      { status: 500 },
    );
  }
}
