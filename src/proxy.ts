import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, AUTH_COOKIE_NAME, getRedirectPath } from '@/lib/auth';

// Paths that do not require authentication
const PUBLIC_PATHS = ['/', '/login', '/favicon.ico'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore Next.js internals, API routes (except if specified), and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    // If user is accessing /login while already authenticated, redirect to their dashboard
    if (pathname === '/login') {
      const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyJWT(token);
        if (payload) {
          return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Check auth cookie for internal app routes (/admin, /customer, /courier)
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyJWT(token) : null;

  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super Admin bypasses all checks
  if (payload.is_super_admin) {
    return NextResponse.next();
  }

  const allowed = payload.allowed_modules || [];

  // Route-to-Module Mapping Guard:
  if (pathname.startsWith('/admin/master') && !allowed.includes('Master Data')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/admin/procurement') && !allowed.includes('Purchase Order (PO)')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/admin/sales-orders') && !allowed.includes('Sales Order (SO)')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/admin/stock') && !allowed.includes('Lihat Stok (Gudang)')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/admin/finance') && !allowed.includes('Finance & Invoice')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/courier') && !allowed.includes('Aplikasi Kurir')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  if (pathname.startsWith('/customer') && !allowed.includes('Katalog Customer')) {
    return NextResponse.redirect(new URL(getRedirectPath(payload), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
