/**
 * GET /api/v1/deposits/slug/[slug] — Single deposit by URL-friendly slug
 * Used by SSR deposit detail pages for SEO.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const depRes = await fetch(`${API}/deposits?slug=eq.${params.slug}&limit=1`, { headers: H });
    const deposits = await depRes.json();

    if (!Array.isArray(deposits) || deposits.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Deposit not found' } },
        { status: 404 },
      );
    }

    const d = deposits[0];

    const [countryRes, classRes] = await Promise.all([
      d.country_id
        ? fetch(`${API}/countries?id=eq.${d.country_id}&limit=1`, { headers: H })
        : Promise.resolve(null),
      d.deposit_classification_id
        ? fetch(`${API}/deposit_classification?id=eq.${d.deposit_classification_id}&limit=1`, {
            headers: H,
          })
        : Promise.resolve(null),
    ]);

    const countries = countryRes ? await countryRes.json() : [];
    const classifications = classRes ? await classRes.json() : [];
    const country = countries?.[0] || null;
    const cls = classifications?.[0] || null;

    return NextResponse.json({
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
        tonnage_grade_pct: d.tonnage_grade_pct ? Number(d.tonnage_grade_pct) : null,
        tonnage_confidence: d.tonnage_confidence || null,
        discovery_year: d.discovery_year || null,
        production_start_year: d.production_start_year || null,
        operator_company: d.operator_company || null,
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
        country_iso: country?.iso_code || null,
        country_name_en: country?.name_en || null,
        country_name_zh: country?.name_zh || null,
        state_province: d.state_province || null,
        deposit_type_code: cls?.code || null,
        deposit_type_name_en: cls?.name_en || null,
        deposit_type_name_zh: cls?.name_zh || null,
        deposit_type_path: cls?.path || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: error.message } },
      { status: 500 },
    );
  }
}
