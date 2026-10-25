import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkIsSuperAdmin } from '@/lib/auth/superAdmin';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.error('Auth error in middleware:', err);
  }

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Static assets and API routes should not trigger middleware redirects
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return response;
  }

  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/',
    '/privacy',
    '/terms',
  ];
  const isPublicRoute = publicRoutes.includes(path);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // If user is not authenticated
  if (!user) {
    if (isDemoMode) {
      // Demo environment direct exploration:
      // Redirect root '/' directly to '/dashboard'
      if (path === '/') {
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
      // Allow unrestricted direct exploration of business owner dashboard & operational tabs
      if (!path.startsWith('/admin')) {
        return response;
      }
    }

    if (!isPublicRoute) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // If user is authenticated
  const isSuperAdmin = checkIsSuperAdmin(user);
  const businessId = user.app_metadata?.business_id;

  // Protect /admin routes - must be super_admin
  if (path.startsWith('/admin')) {
    if (!isSuperAdmin) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Allow access to /privacy, /terms, /reset-password, and /forgot-password even when authenticated
  if (
    path === '/privacy' ||
    path === '/terms' ||
    path === '/reset-password' ||
    path === '/forgot-password'
  ) {
    return response;
  }

  // If authenticated user visits public login/signup/landing
  if (isPublicRoute) {
    if (isSuperAdmin) {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
    if (!businessId) {
      url.pathname = '/onboarding';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  // If authenticated user has no business yet and is NOT super admin, redirect to onboarding
  if (!businessId && !isSuperAdmin && !path.startsWith('/onboarding') && path !== '/login') {
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // If user already has business and goes to onboarding
  if (businessId && path.startsWith('/onboarding')) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
