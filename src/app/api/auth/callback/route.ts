import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const next = type === 'recovery' ? '/reset-password' : (rawNext ?? '/');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = request.nextUrl.origin;
  const redirectBase = forwardedHost ? `https://${forwardedHost}` : origin;

  // Build target redirect response
  const targetRedirectUrl = `${redirectBase}${next}`;
  const response = NextResponse.redirect(targetRedirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 1. Handle token_hash verification (Direct recovery and verification links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // Return response with auth cookies attached directly to the redirect
      return response;
    }
    console.error('[Auth Callback] verifyOtp error:', error.message);

    // For recovery flows, redirect back to forgot-password with error
    if (type === 'recovery') {
      return NextResponse.redirect(
        `${redirectBase}/forgot-password?error=${encodeURIComponent('Your password reset link has expired or is invalid. Please request a new one.')}`
      );
    }

    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message || 'Verification link expired or invalid')}`
    );
  }

  // 2. Handle PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message || 'Authentication code expired or invalid')}`
    );
  }

  // 3. Fallback for recovery flow
  if (type === 'recovery' || next === '/reset-password') {
    return NextResponse.redirect(`${redirectBase}/reset-password`);
  }

  // 4. Fallback error redirect
  return NextResponse.redirect(
    `${redirectBase}/login?error=${encodeURIComponent('Invalid or expired authentication link.')}`
  );
}
