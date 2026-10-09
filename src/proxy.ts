import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
  const isPublicRoute = publicRoutes.includes(path);

  // If user is not authenticated
  if (!user) {
    if (!isPublicRoute) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // If user is authenticated
  const role = user.app_metadata?.role;
  const isSuperAdmin = role === 'super_admin';
  const businessId = user.app_metadata?.business_id;

  // Protect /admin routes - must be super_admin
  if (path.startsWith('/admin')) {
    if (!isSuperAdmin) {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
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
