import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Components during render.
          }
        },
      },
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
          return fetch(url, {
            ...options,
            signal: controller.signal,
          })
            .then((res) => {
              clearTimeout(id);
              return res;
            })
            .catch((err) => {
              clearTimeout(id);
              throw err;
            });
        },
      },
    }
  );
}
