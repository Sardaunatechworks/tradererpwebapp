import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
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

  const { data: { user } } = await supabase.auth.getUser();

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

  // /signup redirects to /login?tab=signup via page component; treat both as public
  const isPublicRoute = path === '/login' || path === '/signup';

  if (!user) {
    // If not logged in and not on a public route, redirect to login
    if (!isPublicRoute) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // If user is logged in
  const role = user.app_metadata?.role;
  const businessId = user.app_metadata?.business_id;

  // 1. Check if user is suspended, restricted, or deleted
  const status = user.app_metadata?.status;
  if (status === 'SUSPENDED' || status === 'RESTRICTED' || status === 'DELETED') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    
    let errMsg = 'Your account has been suspended. Please contact your administrator.';
    if (status === 'RESTRICTED') {
      errMsg = 'Your account is restricted. Please contact your administrator for assistance.';
    } else if (status === 'DELETED') {
      errMsg = 'Your account has been deleted. Please contact your administrator.';
    }
    
    loginUrl.searchParams.set('error', errMsg);
    const redirectResponse = NextResponse.redirect(loginUrl);
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.includes('auth-token') || cookie.name.includes('sb-')) {
        redirectResponse.cookies.set(cookie.name, '', { maxAge: 0 });
      }
    });
    return redirectResponse;
  }

  // 2. Check if user must change password
  const mustChangePassword = user.app_metadata?.must_change_password;
  if (mustChangePassword) {
    if (path !== '/change-password') {
      url.pathname = '/change-password';
      return NextResponse.redirect(url);
    }
    return response;
  } else {
    if (path === '/change-password') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  if (isPublicRoute) {
    // If logged in and trying to go to login/signup, redirect based on role
    if (role === 'super_admin') {
      url.pathname = '/platform';
    } else if (!businessId) {
      url.pathname = '/onboarding';
    } else {
      url.pathname = '/';
    }
    return NextResponse.redirect(url);
  }

  // Handle protected route rules
  if (role === 'super_admin') {
    // Super admins can only access /platform
    if (!path.startsWith('/platform')) {
      url.pathname = '/platform';
      return NextResponse.redirect(url);
    }
  } else {
    // Regular users trying to access /platform
    if (path.startsWith('/platform')) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Regular users who haven't onboarded
    if (!businessId && path !== '/onboarding') {
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // Regular users who have onboarded and try to access /onboarding
    if (businessId && path === '/onboarding') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
