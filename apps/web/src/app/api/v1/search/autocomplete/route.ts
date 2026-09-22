import { atlasDeposits, findCountry } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 5, 1), 20);
  if (!query) return NextResponse.json([]);

  const results = atlasDeposits
    .filter((deposit) => {
      const country = findCountry(deposit.countryIso);
      return [deposit.name, deposit.nameZh, deposit.slug, country?.name_en, country?.name_zh]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 1 : 0;
      return bStarts - aStarts || (b.tonnageMt || 0) - (a.tonnageMt || 0);
    })
    .slice(0, limit)
    .map((deposit) => {
      const country = findCountry(deposit.countryIso);
      return {
        id: deposit.slug,
        name: deposit.name,
        name_zh: deposit.nameZh,
        slug: deposit.slug,
        country_iso: deposit.countryIso,
        country_name_en: country?.name_en || deposit.countryIso,
        country_name_zh: country?.name_zh || null,
        status: deposit.status,
        tonnage_mt: deposit.tonnageMt,
      };
    });

  return NextResponse.json(results);
}
