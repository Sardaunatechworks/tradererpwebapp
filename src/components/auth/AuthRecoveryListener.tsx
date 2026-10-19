'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthRecoveryListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Immediate URL hash check (implicit recovery flow)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (
        (hash.includes('type=recovery') || hash.includes('access_token')) &&
        pathname !== '/reset-password'
      ) {
        if (hash.includes('type=recovery')) {
          window.location.href = `/reset-password${hash}`;
          return;
        }
      }
    }

    // 2. Auth state change listener (catches Supabase recovery sessions globally)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (pathname !== '/reset-password') {
          router.push('/reset-password');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  return null;
}
