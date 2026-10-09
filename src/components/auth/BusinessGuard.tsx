'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function BusinessGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkBusiness() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        const role = user.app_metadata?.role;
        const businessId = user.app_metadata?.business_id;

        if (role === 'super_admin' && !businessId) {
          router.replace('/admin');
          return;
        }

        if (!businessId) {
          // Check if there is any membership in business_members table
          const { data: membership } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          if (!membership?.business_id) {
            if (role === 'super_admin') {
              router.replace('/admin');
            } else {
              router.replace('/onboarding');
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error in BusinessGuard:', err);
      } finally {
        setLoading(false);
      }
    }

    checkBusiness();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-2" />
        <p className="text-sm font-medium text-slate-500">Checking business workspace...</p>
      </div>
    );
  }

  return <>{children}</>;
}
