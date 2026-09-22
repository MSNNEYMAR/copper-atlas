import { atlasDeposits } from '@/lib/atlas-data';
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blacksyb.com';
const locales = ['en', 'zh'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const staticPages = ['', '/map', '/statistics', '/about'];

  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '/map' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/map' ? 0.9 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((item) => [item, `${BASE_URL}/${item}${page}`])),
        },
      });
    }
  }

  for (const deposit of atlasDeposits) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/deposits/${deposit.slug}`,
        lastModified: new Date(`${deposit.lastVerifiedDate || '2026-07-04'}T00:00:00Z`),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((item) => [item, `${BASE_URL}/${item}/deposits/${deposit.slug}`]),
          ),
        },
      });
    }
  }

  return entries;
}
