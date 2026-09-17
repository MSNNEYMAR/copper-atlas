/**
 * GET /api/v1/countries — List countries with copper deposit counts
 * Used by the country filter dropdown in the search panel.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function GET(request: NextRequest) {
  const mineral = request.nextUrl.searchParams.get('mineral') || 'copper';
  try {
    const url = `${API}/countries?select=*&order=name_en`;
    const res = await fetch(url, { headers: H });
    const data = await res.json();

    // For each country, get the deposit count
    const countries = (Array.isArray(data) ? data : []).map((c: any) => ({
      iso_code: c.iso_code,
      iso_code_3: c.iso_code_3,
      name_en: c.name_en,
      name_zh: c.name_zh,
      continent: c.continent || null,
      deposit_count: 0,
      total_tonnage_mt: null,
    }));

    // Fetch deposit counts in one query
    const countRes = await fetch(
      `${API}/deposits?select=country_id&primary_mineral=eq.${mineral}&is_active=eq.true&limit=1000`,
      { headers: H },
    );
    const deposits = await countRes.json();
    const counts = new Map<string, number>();
    (Array.isArray(deposits) ? deposits : []).forEach((d: any) => {
      counts.set(d.country_id, (counts.get(d.country_id) || 0) + 1);
    });

    for (const c of countries) {
      // Find matching country by ISO
      const countryDeposits = await fetch(
        `${API}/deposits?select=country_id&primary_mineral=eq.${mineral}&is_active=eq.true&country_id=eq.${c.iso_code}&limit=0&head=true`,
        { headers: { ...H, Prefer: 'count=exact' } },
      );
      const total = Number.parseInt(
        countryDeposits.headers.get('content-range')?.split('/')[1] || '0',
      );
      c.deposit_count = total;
    }

    const filtered = countries.filter((c: any) => c.deposit_count > 0);

    return NextResponse.json(filtered);
  } catch (_error: any) {
    return NextResponse.json([], { status: 200 });
  }
}
