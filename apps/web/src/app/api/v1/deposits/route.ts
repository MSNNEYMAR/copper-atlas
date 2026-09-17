/**
 * GET /api/v1/deposits — List deposits
 * GET /api/v1/deposits/[id] — Single deposit detail
 *
 * Queries Supabase PostgREST. Returns GeoJSON FeatureCollection.
 * All filtering is done via PostgREST query params for performance.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

function parseBbox(
  bbox: string,
): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  const parts = bbox.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  return { minLon: parts[0], minLat: parts[1], maxLon: parts[2], maxLat: parts[3] };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const bbox = params.get('bbox');
  const mineral = params.get('mineral') || 'copper';
  const country = params.get('country');
  const status = params.get('status');
  const search = params.get('search');
  const minTonnage = params.get('min_tonnage');
  const maxTonnage = params.get('max_tonnage');
  const minGrade = params.get('min_grade');
  const maxGrade = params.get('max_grade');
  const page = Number.parseInt(params.get('page') || '1');
  const size = Math.min(Number.parseInt(params.get('size') || '200'), 500);

  try {
    // Fetch ALL deposits with pagination (Supabase PostgREST max 1000 per request)
    // Phase 1: fetch page 0 (first 1000) to get total count
    let allRows: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let pageUrl = `${API}/deposits?select=*&primary_mineral=eq.${mineral}&is_active=eq.true&order=tonnage_mt.desc.nullslast&limit=${pageSize}&offset=${offset}`;
      if (status) pageUrl += `&status=in.(${status.split(',').join(',')})`;
      if (minTonnage) pageUrl += `&tonnage_mt=gte.${minTonnage}`;
      if (maxTonnage) pageUrl += `&tonnage_mt=lte.${maxTonnage}`;
      if (minGrade) pageUrl += `&tonnage_grade_pct=gte.${minGrade}`;
      if (maxGrade) pageUrl += `&tonnage_grade_pct=lte.${maxGrade}`;
      if (search)
        pageUrl += `&or=(name.ilike.*${encodeURIComponent(search)}*,name_zh.ilike.*${encodeURIComponent(search)}*)`;
      const pageRes = await fetch(pageUrl, { headers: H });
      const pageData = await pageRes.json();
      if (Array.isArray(pageData) && pageData.length > 0) {
        allRows = allRows.concat(pageData);
        offset += pageSize;
        if (pageData.length < pageSize) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // Fetch reference data (countries + classifications) in parallel
    const [countriesRes, classRes] = await Promise.all([
      fetch(`${API}/countries?select=*&limit=150`, { headers: H }),
      fetch(`${API}/deposit_classification?select=*&limit=100`, { headers: H }),
    ]);

    const countries = await countriesRes.json();
    const classifications = await classRes.json();

    // Build lookup maps
    const countryMap = new Map<string, any>((countries || []).map((c: any) => [c.id, c]));
    const classMap = new Map<string, any>((classifications || []).map((c: any) => [c.id, c]));

    let rows = allRows;

    // BBox spatial filter — only return deposits in current map viewport
    if (bbox) {
      const box = parseBbox(bbox);
      if (box) {
        rows = rows.filter((d: any) => {
          const [lon, lat] = d.location?.coordinates || [];
          return lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat;
        });
      }
    }

    // Country filter — matched via country lookup map after join
    if (country) {
      const isos = new Set(country.split(',').map((s) => s.trim()));
      rows = rows.filter((d: any) => {
        const c = countryMap.get(d.country_id);
        return c && isos.has(c.iso_code);
      });
    }

    // Build GeoJSON FeatureCollection
    const features = rows.map((d: any) => {
      const country = countryMap.get(d.country_id);
      const cls = classMap.get(d.deposit_classification_id);
      return {
        type: 'Feature',
        id: d.id,
        geometry: d.location ? { type: 'Point', coordinates: d.location.coordinates } : null,
        properties: {
          id: d.id,
          name: d.name,
          name_zh: d.name_zh || null,
          slug: d.slug,
          primary_mineral: d.primary_mineral,
          secondary_minerals: d.secondary_minerals || [],
          status: d.status || 'unknown',
          tonnage_mt: d.tonnage_mt ? Number(d.tonnage_mt) : null,
          tonnage_mt_low: d.tonnage_mt_low ? Number(d.tonnage_mt_low) : null,
          tonnage_mt_high: d.tonnage_mt_high ? Number(d.tonnage_mt_high) : null,
          tonnage_grade_pct: d.tonnage_grade_pct ? Number(d.tonnage_grade_pct) : null,
          tonnage_cutoff_pct: d.tonnage_cutoff_pct ? Number(d.tonnage_cutoff_pct) : null,
          tonnage_confidence: d.tonnage_confidence || null,
          proven_mt: d.proven_mt ? Number(d.proven_mt) : null,
          probable_mt: d.probable_mt ? Number(d.probable_mt) : null,
          measured_mt: d.measured_mt ? Number(d.measured_mt) : null,
          indicated_mt: d.indicated_mt ? Number(d.indicated_mt) : null,
          inferred_mt: d.inferred_mt ? Number(d.inferred_mt) : null,
          discovery_year: d.discovery_year || null,
          production_start_year: d.production_start_year || null,
          production_end_year: d.production_end_year || null,
          operator_company: d.operator_company || null,
          owner_companies: d.owner_companies || [],
          mining_method: d.mining_method || null,
          host_rock_type: d.host_rock_type || null,
          host_rock_age_text: d.host_rock_age_text || null,
          mineralization_age_ma: d.mineralization_age_ma ? Number(d.mineralization_age_ma) : null,
          mineralization_age_error_ma: d.mineralization_age_error_ma
            ? Number(d.mineralization_age_error_ma)
            : null,
          mineralization_age_method: d.mineralization_age_method || null,
          tectonic_setting: d.tectonic_setting || null,
          geological_province: d.geological_province || null,
          metallogenic_belt: d.metallogenic_belt || null,
          summary_en: d.summary_en || null,
          summary_zh: d.summary_zh || null,
          geology_en: d.geology_en || null,
          geology_zh: d.geology_zh || null,
          data_source: d.data_source || null,
          data_source_url: d.data_source_url || null,
          reference_dois: d.reference_dois || [],
          last_verified_date: d.last_verified_date || null,
          data_quality_score: d.data_quality_score || null,
          is_featured: d.is_featured || false,
          tags: d.tags || [],
          images: d.images || [],
          documents: d.documents || [],
          properties: d.properties || {},
          // Joined data
          country_iso: country?.iso_code || null,
          country_name_en: country?.name_en || null,
          country_name_zh: country?.name_zh || null,
          state_province: d.state_province || null,
          deposit_type_code: cls?.code || null,
          deposit_type_name_en: cls?.name_en || null,
          deposit_type_name_zh: cls?.name_zh || null,
          deposit_type_path: cls?.path || null,
        },
      };
    });

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      meta: { total: rows.length, page, size, pages: Math.ceil(rows.length / size) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 },
    );
  }
}
