import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = request.nextUrl.origin;
  const redirectBase = forwardedHost ? `https://${forwardedHost}` : origin;

  const supabase = await createClient();

  // 1. Handle token_hash verification (Direct recovery and verification links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
    console.error('[Auth Callback] verifyOtp error:', error.message);
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message || 'Verification link expired or invalid')}`
    );
  }

  // 2. Handle PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
    console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message || 'Authentication code expired or invalid')}`
    );
  }

  // 3. Fallback for implicit recovery links (hash fragments preserved across redirect)
  if (next === '/reset-password') {
    return NextResponse.redirect(`${redirectBase}/reset-password`);
  }

  // 4. Fallback error redirect
  return NextResponse.redirect(`${redirectBase}/login?error=Could not authenticate user`);
}
