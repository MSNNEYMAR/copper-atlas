import { atlasDeposits, findClassification, findCountry } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 10, 1), 50);
  if (!query) return NextResponse.json({ results: [], query, total: 0 });

  const scored = atlasDeposits
    .map((deposit) => {
      const country = findCountry(deposit.countryIso);
      const classification = findClassification(deposit.depositTypeCode);
      const values = [
        deposit.name,
        deposit.nameZh,
        deposit.slug,
        country?.name_en,
        country?.name_zh,
        classification?.name_en,
        classification?.name_zh,
        deposit.operatorCompany,
        deposit.hostRockType,
        deposit.tectonicSetting,
        deposit.geologicalProvince,
        deposit.metallogenicBelt,
        deposit.stateProvince,
        deposit.tags.join(' '),
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

      let score = 0;
      const name = deposit.name.toLowerCase();
      const nameZh = deposit.nameZh?.toLowerCase() || '';
      if (name === query || nameZh === query) score = 100;
      else if (name.startsWith(query) || nameZh.startsWith(query)) score = 90;
      else if (values.some((value) => value.includes(query))) score = 60;
      else if (query.length >= 3) {
        const hits = Array.from(query).filter((character) => name.includes(character)).length;
        if (hits > query.length * 0.6) score = 20;
      }

      return { deposit, country, classification, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.deposit.tonnageMt || 0) - (a.deposit.tonnageMt || 0))
    .slice(0, limit)
    .map(({ deposit, country, classification, score }) => ({
      id: deposit.slug,
      name: deposit.name,
      name_zh: deposit.nameZh,
      slug: deposit.slug,
      primary_mineral: deposit.primaryMineral,
      status: deposit.status,
      tonnage_mt: deposit.tonnageMt,
      country_iso: deposit.countryIso,
      country_name_en: country?.name_en || deposit.countryIso,
      country_name_zh: country?.name_zh || null,
      classification_name_en: classification?.name_en || deposit.depositTypeCode,
      classification_name_zh: classification?.name_zh || null,
      relevance: score,
      score,
      source: 'bundled_dataset',
    }));

  return NextResponse.json({ results: scored, query, total: scored.length });
}
