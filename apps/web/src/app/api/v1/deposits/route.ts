import {
  atlasDeposits,
  findClassification,
  toDepositFeature,
  type AtlasDeposit,
} from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function parseList(value: string | null): string[] {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function matchesType(deposit: AtlasDeposit, requested: string[]): boolean {
  if (requested.length === 0) return true;
  const classification = findClassification(deposit.depositTypeCode);
  if (!classification) return requested.includes(deposit.depositTypeCode || '');

  return requested.some((value) => {
    const normalized = value.toLowerCase();
    return (
      classification.code.toLowerCase() === normalized ||
      classification.path.toLowerCase() === normalized ||
      classification.path.toLowerCase().startsWith(`${normalized}.`) ||
      normalized.startsWith(`${classification.path.toLowerCase()}.`)
    );
  });
}

function matchesSearch(deposit: AtlasDeposit, query: string): boolean {
  const needle = query.toLowerCase();
  const searchable = [
    deposit.name,
    deposit.nameZh,
    deposit.slug,
    deposit.countryIso,
    deposit.depositTypeCode,
    deposit.operatorCompany,
    deposit.hostRockType,
    deposit.tectonicSetting,
    deposit.geologicalProvince,
    deposit.metallogenicBelt,
    deposit.stateProvince,
    deposit.tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return searchable.includes(needle);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mineral = params.get('mineral') || 'copper';
  const bbox = parseList(params.get('bbox')).map(Number);
  const countries = parseList(params.get('country'));
  const statuses = parseList(params.get('status'));
  const typeFilters = parseList(params.get('deposit_type'));
  const search = params.get('search')?.trim() || '';
  const minTonnage = params.has('min_tonnage') ? Number(params.get('min_tonnage')) : null;
  const maxTonnage = params.has('max_tonnage') ? Number(params.get('max_tonnage')) : null;
  const minGrade = params.has('min_grade') ? Number(params.get('min_grade')) : null;
  const maxGrade = params.has('max_grade') ? Number(params.get('max_grade')) : null;
  const featured = params.get('is_featured');
  const page = Math.max(Number.parseInt(params.get('page') || '1', 10) || 1, 1);
  const size = Math.min(Math.max(Number.parseInt(params.get('size') || '5000', 10) || 5000, 1), 5000);
  const sort = params.get('sort');
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';

  let rows = atlasDeposits.filter((deposit) => deposit.primaryMineral === mineral);

  if (bbox.length === 4 && bbox.every(Number.isFinite)) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    rows = rows.filter(
      (deposit) =>
        deposit.longitude >= minLon &&
        deposit.longitude <= maxLon &&
        deposit.latitude >= minLat &&
        deposit.latitude <= maxLat,
    );
  }

  if (countries.length) {
    const selected = new Set(countries.map((value) => value.toUpperCase()));
    rows = rows.filter((deposit) => selected.has(deposit.countryIso.toUpperCase()));
  }

  if (statuses.length) {
    const selected = new Set(statuses);
    rows = rows.filter((deposit) => selected.has(deposit.status));
  }

  rows = rows.filter((deposit) => matchesType(deposit, typeFilters));

  if (minTonnage !== null && Number.isFinite(minTonnage)) {
    rows = rows.filter((deposit) => deposit.tonnageMt !== null && deposit.tonnageMt >= minTonnage);
  }
  if (maxTonnage !== null && Number.isFinite(maxTonnage)) {
    rows = rows.filter((deposit) => deposit.tonnageMt !== null && deposit.tonnageMt <= maxTonnage);
  }
  if (minGrade !== null && Number.isFinite(minGrade)) {
    rows = rows.filter(
      (deposit) => deposit.tonnageGradePct !== null && deposit.tonnageGradePct >= minGrade,
    );
  }
  if (maxGrade !== null && Number.isFinite(maxGrade)) {
    rows = rows.filter(
      (deposit) => deposit.tonnageGradePct !== null && deposit.tonnageGradePct <= maxGrade,
    );
  }
  if (featured === 'true') rows = rows.filter((deposit) => deposit.isFeatured);
  if (search) rows = rows.filter((deposit) => matchesSearch(deposit, search));

  const sortField = sort === 'name' ? 'name' : sort === 'grade' ? 'grade' : 'tonnage';
  rows = [...rows].sort((a, b) => {
    if (sortField === 'name') return a.name.localeCompare(b.name) * (order === 'asc' ? 1 : -1);
    const left = sortField === 'grade' ? a.tonnageGradePct : a.tonnageMt;
    const right = sortField === 'grade' ? b.tonnageGradePct : b.tonnageMt;
    return ((left ?? -1) - (right ?? -1)) * (order === 'asc' ? 1 : -1);
  });

  const total = rows.length;
  const start = (page - 1) * size;
  const pageRows = rows.slice(start, start + size);

  return NextResponse.json({
    type: 'FeatureCollection',
    features: pageRows.map((deposit) => toDepositFeature(deposit)),
    meta: {
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    },
  });
}
