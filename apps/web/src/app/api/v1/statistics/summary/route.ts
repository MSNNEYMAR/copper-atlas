import { atlasDeposits } from '@/lib/atlas-data';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const rows = atlasDeposits.filter((deposit) => deposit.primaryMineral === 'copper');
  const tonnage = rows.map((row) => row.tonnageMt).filter((value): value is number => value !== null);
  const grades = rows.map((row) => row.tonnageGradePct).filter((value): value is number => value !== null);
  const largest = [...rows]
    .filter((row): row is typeof row & { tonnageMt: number } => row.tonnageMt !== null)
    .sort((a, b) => b.tonnageMt - a.tonnageMt)[0];
  const highest = [...rows]
    .filter((row): row is typeof row & { tonnageGradePct: number } => row.tonnageGradePct !== null)
    .sort((a, b) => b.tonnageGradePct - a.tonnageGradePct)[0];

  return NextResponse.json({
    total_deposits: rows.length,
    total_tonnage_mt: tonnage.reduce((sum, value) => sum + value, 0),
    avg_grade_pct: grades.length ? grades.reduce((sum, value) => sum + value, 0) / grades.length : null,
    countries_count: new Set(rows.map((row) => row.countryIso)).size,
    producing_count: rows.filter((row) => row.status === 'production').length,
    largest_deposit: largest
      ? { name: largest.name, slug: largest.slug, tonnage_mt: largest.tonnageMt }
      : null,
    highest_grade_deposit: highest
      ? { name: highest.name, slug: highest.slug, grade_pct: highest.tonnageGradePct }
      : null,
  });
}
