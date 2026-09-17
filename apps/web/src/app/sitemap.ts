/**
 * Copper Atlas — Dynamic Sitemap
 * 全局铜矿床图谱 — 动态站点地图
 *
 * Next.js App Router convention: this file at app/sitemap.ts
 * generates a sitemap.xml at /sitemap.xml.
 *
 * Includes:
 * - Static pages (home, map, statistics, about)
 * - Deposit detail pages (fetched from API — first 100 most important)
 */

import type { MetadataRoute } from 'next';

const _locales = ['en', 'zh'];
const API_BASE = '/api/v1';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://copper-atlas.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages (both locales)
  const staticPages = ['', '/map', '/statistics', '/about'];
  const locales = ['en', 'zh'];

  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '/map' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/map' ? 0.9 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${BASE_URL}/${l}${page}`])),
        },
      });
    }
  }

  // Deposit detail pages — fetch top deposits from API
  try {
    const res = await fetch(
      `${API_BASE}/deposits?mineral=copper&sort=tonnage_mt&order=desc&size=100&is_featured=true`,
      { next: { revalidate: 86400 } }, // Revalidate daily
    );

    if (res.ok) {
      const data = await res.json();
      const deposits = data.features || [];

      for (const feature of deposits) {
        const slug = feature.properties?.slug;
        if (!slug) continue;

        for (const locale of locales) {
          entries.push({
            url: `${BASE_URL}/${locale}/deposits/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: {
              languages: Object.fromEntries(
                locales.map((l) => [l, `${BASE_URL}/${l}/deposits/${slug}`]),
              ),
            },
          });
        }
      }
    }
  } catch {
    // API not available — skip dynamic deposit pages in sitemap
  }

  return entries;
}
