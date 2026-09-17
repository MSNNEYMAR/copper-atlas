/**
 * Copper Atlas — i18n Middleware (no next-intl dependency)
 * Redirects / → /en and validates locale prefix.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['en', 'zh'];
const DEFAULT = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Root path → redirect to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT}`, request.url));
  }

  // Check if path starts with a valid locale
  const firstSegment = pathname.split('/')[1];
  if (!LOCALES.includes(firstSegment)) {
    // No locale prefix — prepend default
    return NextResponse.redirect(new URL(`/${DEFAULT}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|robots|sitemap|favicon).*)'],
};
