import { atlasCountries, atlasDeposits } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const mineral = request.nextUrl.searchParams.get('mineral') || 'copper';
  const rows = atlasDeposits.filter((deposit) => deposit.primaryMineral === mineral);
  const totals = new Map<string, { count: number; tonnage: number }>();

  for (const deposit of rows) {
    const current = totals.get(deposit.countryIso) || { count: 0, tonnage: 0 };
    current.count += 1;
    current.tonnage += deposit.tonnageMt || 0;
    totals.set(deposit.countryIso, current);
  }

  const data = atlasCountries
    .map((country) => {
      const total = totals.get(country.iso_code);
      return {
        ...country,
        deposit_count: total?.count || 0,
        total_tonnage_mt: total?.tonnage || null,
      };
    })
    .filter((country) => country.deposit_count > 0)
    .sort((a, b) => a.name_en.localeCompare(b.name_en));

  return NextResponse.json(data);
}
