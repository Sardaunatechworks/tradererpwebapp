'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  if (!email || !password || !name) {
    return { error: 'All fields are required' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`,
      data: {
        name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.user) {
    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: email,
        name: name,
        role: 'OWNER',
        status: 'active'
      });
    } catch (dbErr) {
      console.error('Trigger fallback user profile insertion failed:', dbErr);
    }
  }

  return { success: true };
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function sendPasswordResetEmail(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) {
    return { error: 'Email address is required.' };
  }

  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Bypass RLS to check if the user is suspended or restricted in the DB
    const { data: dbUser, error: dbErr } = await supabaseAdmin
      .from('users')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (dbUser) {
      if (dbUser.status === 'suspended' || dbUser.status === 'restricted') {
        return { error: 'This account has been suspended or restricted. Please contact support.' };
      }
    }

    // Determine site URL dynamically from headers to handle dynamic environments
    const headersList = await headers();
    const host = headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || 'http';
    const siteUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/api/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An error occurred while sending reset link.' };
  }
}

export async function updatePasswordWithoutOld(formData: FormData) {
  const newPassword = formData.get('newPassword') as string;
  const confirmNewPassword = formData.get('confirmNewPassword') as string;

  if (!newPassword || !confirmNewPassword) {
    return { error: 'All fields are required.' };
  }

  if (newPassword !== confirmNewPassword) {
    return { error: 'New passwords do not match.' };
  }

  // Complexity rules validation
  if (newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters long.' };
  }

  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  if (!hasUppercase) {
    return { error: 'New password must contain at least one uppercase letter.' };
  }

  if (!hasNumber) {
    return { error: 'New password must contain at least one number.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user || !user.email) {
      return { error: 'Session not found or expired. Please request a new password reset link.' };
    }

    // Live security check for read access (suspended or deleted users blocked)
    const { validateReadAccess } = await import('@/lib/security');
    try {
      await validateReadAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    // Update to the new password using the active authenticated client
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateErr) {
      return { error: updateErr.message };
    }

    // Update must_change_password to false in public.users and auth app_metadata
    try {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          must_change_password: false
        }
      });

      await supabaseAdmin
        .from('users')
        .update({ must_change_password: false })
        .eq('id', user.id);
    } catch (metaErr) {
      console.error('Failed to update must_change_password flags:', metaErr);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An error occurred during password change.' };
  }
}

