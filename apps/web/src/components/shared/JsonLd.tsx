/**
 * Copper Atlas — JSON-LD Structured Data
 * 全球铜矿床图谱 — JSON-LD 结构化数据
 *
 * Generates Schema.org structured data for SEO and rich search results.
 * Used on deposit detail pages and statistics dashboard.
 */

'use client';

import type { DepositDetailProperties } from '@/types/deposit';

// ============================================================================
// Deposit Detail — Schema.org Place with GeoCoordinates
// ============================================================================

export function DepositJsonLd({ deposit }: { deposit: DepositDetailProperties }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: deposit.name,
    description:
      deposit.summary_en || `${deposit.name} — ${deposit.deposit_type_name_en} copper deposit`,
    geo:
      deposit.latitude && deposit.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: deposit.latitude,
            longitude: deposit.longitude,
          }
        : undefined,
    address: deposit.country_iso
      ? {
          '@type': 'PostalAddress',
          addressCountry: deposit.country_iso,
          addressRegion: deposit.state_province || undefined,
        }
      : undefined,
    additionalProperty: [
      deposit.tonnage_mt
        ? {
            '@type': 'PropertyValue',
            name: 'Total contained copper',
            value: `${deposit.tonnage_mt} Mt`,
            unitText: 'Million metric tonnes',
          }
        : undefined,
      deposit.tonnage_grade_pct
        ? {
            '@type': 'PropertyValue',
            name: 'Average grade',
            value: `${deposit.tonnage_grade_pct}%`,
            unitText: 'Percent Cu',
          }
        : undefined,
      deposit.status
        ? {
            '@type': 'PropertyValue',
            name: 'Operational status',
            value: deposit.status,
          }
        : undefined,
      deposit.discovery_year
        ? {
            '@type': 'PropertyValue',
            name: 'Discovery year',
            value: String(deposit.discovery_year),
          }
        : undefined,
    ].filter(Boolean),
    sameAs: deposit.reference_dois?.map((doi: string) => `https://doi.org/${doi}`),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

// ============================================================================
// Dataset — Schema.org Dataset for statistics / about pages
// ============================================================================

export function DatasetJsonLd({
  name = 'Global Copper Deposits Atlas',
  description = 'A professional geological platform for exploring global copper deposits with interactive maps and comprehensive data.',
  version = '1.0.0',
}: {
  name?: string;
  description?: string;
  version?: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    version,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: {
      '@type': 'Organization',
      name: 'Copper Atlas',
    },
    keywords: ['copper deposits', 'geology', 'mineral exploration', 'porphyry copper', 'mining'],
    spatialCoverage: 'World',
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
