/**
 * GET /api/v1/reference — Combined reference data dispatching
 *    /deposit-types → deposit classification tree
 *    /time-scale → geological time scale
 *    /statuses → operational status codes
 *    /minerals → mineral registry
 */
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API = 'https://aamagslubcfodgeiiqor.supabase.co/rest/v1';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbWFnc2x1YmNmb2RnZWlpcW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDQwOTQsImV4cCI6MjA5ODcyMDA5NH0.0oxFOeIYUMOG4sRKPGXTPe84ajqcl8I36TElpZ7fZko';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'statuses';

  try {
    switch (type) {
      case 'deposit-types': {
        const res = await fetch(
          `${API}/deposit_classification?select=*&is_active=eq.true&order=sort_order,depth`,
          { headers: H },
        );
        const data = await res.json();
        return NextResponse.json(
          (Array.isArray(data) ? data : []).map((t: any) => ({
            code: t.code,
            path: String(t.path),
            name_en: t.name_en,
            name_zh: t.name_zh,
            parent_code: t.parent_code,
            depth: t.depth,
            description_en: t.description_en,
            tectonic_setting: t.tectonic_setting,
            sort_order: t.sort_order,
          })),
        );
      }

      case 'time-scale': {
        const res = await fetch(
          `${API}/geological_time_scale?select=*&is_active=eq.true&order=sort_order,base_age_ma.desc`,
          { headers: H },
        );
        const data = await res.json();
        return NextResponse.json(
          (Array.isArray(data) ? data : []).map((t: any) => ({
            id: t.id,
            name_en: t.name_en,
            name_zh: t.name_zh,
            rank_en: t.rank_en,
            rank_zh: t.rank_zh,
            base_age_ma: Number(t.base_age_ma),
            top_age_ma: Number(t.top_age_ma),
            path: String(t.path),
            color_hex: t.color_hex,
          })),
        );
      }

      case 'minerals': {
        const res = await fetch(`${API}/mineral_i18n?select=*&order=sort_order`, { headers: H });
        const data = await res.json();
        return NextResponse.json(
          (Array.isArray(data) ? data : []).map((m: any) => ({
            mineral_code: m.mineral_code,
            chemical_symbol: m.chemical_symbol,
            name_en: m.name,
            enabled: m.is_enabled,
            phase: m.phase,
          })),
        );
      }
      default: {
        return NextResponse.json([
          { value: 'exploration', label_en: 'Exploration', label_zh: '勘探' },
          { value: 'feasibility', label_en: 'Feasibility', label_zh: '可行性研究' },
          { value: 'development', label_en: 'Development', label_zh: '开发建设' },
          { value: 'production', label_en: 'Production', label_zh: '生产中' },
          { value: 'suspended', label_en: 'Suspended', label_zh: '暂停' },
          { value: 'closed', label_en: 'Closed', label_zh: '已关闭' },
          { value: 'depleted', label_en: 'Depleted', label_zh: '已采尽' },
          { value: 'unknown', label_en: 'Unknown', label_zh: '未知' },
        ]);
      }
    }
  } catch (_error: any) {
    return NextResponse.json([], { status: 200 });
  }
}
