/** GET /api/v1/health */
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '0.1.0',
    database: 'connected',
  });
}
