import { atlasClassifications } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STATUSES = [
  { value: 'exploration', label_en: 'Exploration', label_zh: '勘探' },
  { value: 'feasibility', label_en: 'Feasibility', label_zh: '可行性研究' },
  { value: 'development', label_en: 'Development', label_zh: '开发建设' },
  { value: 'production', label_en: 'Production', label_zh: '生产中' },
  { value: 'suspended', label_en: 'Suspended', label_zh: '暂停' },
  { value: 'closed', label_en: 'Closed', label_zh: '已关闭' },
  { value: 'depleted', label_en: 'Depleted', label_zh: '已采尽' },
  { value: 'unknown', label_en: 'Unknown', label_zh: '未知' },
];

const MINERALS = [
  { mineral_code: 'copper', chemical_symbol: 'Cu', name_en: 'Copper', name_zh: '铜', enabled: true, phase: 1 },
  { mineral_code: 'gold', chemical_symbol: 'Au', name_en: 'Gold', name_zh: '金', enabled: false, phase: 2 },
  { mineral_code: 'iron', chemical_symbol: 'Fe', name_en: 'Iron', name_zh: '铁', enabled: false, phase: 2 },
  { mineral_code: 'lithium', chemical_symbol: 'Li', name_en: 'Lithium', name_zh: '锂', enabled: false, phase: 2 },
];

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'statuses';

  if (type === 'deposit-types') return NextResponse.json(atlasClassifications);
  if (type === 'statuses') return NextResponse.json(STATUSES);
  if (type === 'minerals') return NextResponse.json(MINERALS);
  if (type === 'time-scale') return NextResponse.json([]);

  return NextResponse.json(STATUSES);
}
