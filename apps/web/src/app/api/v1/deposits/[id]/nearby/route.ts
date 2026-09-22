import { atlasDeposits, findAtlasDeposit, toDepositFeature } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const center = findAtlasDeposit(params.id);
  if (!center) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Deposit not found' } },
      { status: 404 },
    );
  }

  const radiusKm = Math.max(Number(request.nextUrl.searchParams.get('radius_km')) || 50, 1);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit')) || 10, 1), 50);
  const rows = atlasDeposits
    .filter((deposit) => deposit.slug !== center.slug)
    .map((deposit) => ({
      deposit,
      distance: distanceKm(center.latitude, center.longitude, deposit.latitude, deposit.longitude),
    }))
    .filter((entry) => entry.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return NextResponse.json({
    type: 'FeatureCollection',
    features: rows.map(({ deposit }) => toDepositFeature(deposit)),
    meta: { total: rows.length, page: 1, size: limit, pages: rows.length ? 1 : 0 },
  });
}
