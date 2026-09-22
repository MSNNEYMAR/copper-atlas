import { findAtlasDeposit, toDepositFeature } from '@/lib/atlas-data';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const deposit = findAtlasDeposit(params.id);
  if (!deposit) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Deposit not found' } },
      { status: 404 },
    );
  }
  return NextResponse.json(toDepositFeature(deposit, true));
}
