import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname === '/login';
  const isApiAuth = pathname.startsWith('/api/auth');
  const isPublic = pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  if (isApiAuth || isPublic) return NextResponse.next();

  if (!isLoggedIn && !isAuthRoute) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/clients', req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
