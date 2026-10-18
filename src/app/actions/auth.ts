'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkIsSuperAdmin } from '@/lib/auth/superAdmin';
import { sendPasswordResetEmailViaMailhive } from '@/lib/email/mailhive';

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const phone = (formData.get('phone') as string)?.trim() || null;

  if (!email || !password || !name) {
    return { error: 'All fields are required.' };
  }

  if (!phone) {
    return { error: 'Phone number is required.' };
  }

  // Server-side email format validation (OWASP / Input Validation)
  const emailTrimmed = email.trim().toLowerCase();
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!EMAIL_REGEX.test(emailTrimmed)) {
    return { error: 'Invalid email address format.' };
  }

  // Server-side password complexity validation
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { error: 'Password must contain at least one number.' };
  }

  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let userId: string | null = null;

    // 1. Create user directly with auto-confirmed email (skips email verification)
    const { data: adminUser, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrimmed,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
      },
    });

    if (adminErr) {
      const errMsg = adminErr.message.toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('registered')) {
        return { error: 'An account with this email already exists. Please sign in.' };
      }

      // Fallback: standard signUp followed by admin email auto-confirmation
      const supabase = await createClient();
      const { data: regularData, error: regularErr } = await supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (regularErr) {
        return { error: regularErr.message };
      }

      if (regularData.user) {
        userId = regularData.user.id;
        // Auto-confirm the user email via admin
        await supabaseAdmin.auth.admin.updateUserById(regularData.user.id, {
          email_confirm: true,
        });
      }
    } else if (adminUser.user) {
      userId = adminUser.user.id;
    }

    // 2. Ensure public.users profile exists
    if (userId) {
      await supabaseAdmin.from('users').upsert({
        id: userId,
        email: emailTrimmed,
        name: name,
        phone: phone,
        status: 'active',
      });
    }

    // 3. Immediately sign in to establish active session cookies
    const supabase = await createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password,
    });

    if (signInErr) {
      return { error: `Account created, but sign-in failed: ${signInErr.message}` };
    }
  } catch (err: any) {
    if (err?.message?.includes('NEXT_REDIRECT')) {
      throw err;
    }
    return { error: err.message || 'An error occurred during account creation.' };
  }

  // 4. Redirect immediately to the next step (/onboarding)
  redirect('/onboarding');
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const emailTrimmed = email.trim();
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!EMAIL_REGEX.test(emailTrimmed)) {
    return { error: 'Invalid email address format.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailTrimmed,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (checkIsSuperAdmin(data?.user)) {
    redirect('/admin');
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function sendPasswordResetEmail(formData: FormData) {
  const rawEmail = (formData.get('email') as string)?.trim().toLowerCase();
  if (!rawEmail) {
    return { error: 'Email address is required.' };
  }
  const email = rawEmail;

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

    // 1. Verify that the user account exists in the database
    const { data: dbUser, error: dbErr } = await supabaseAdmin
      .from('users')
      .select('id, email, status')
      .ilike('email', email)
      .maybeSingle();

    if (dbErr || !dbUser) {
      return { error: 'No account found with this email address. Please check and try again.' };
    }

    if (dbUser.status === 'suspended' || dbUser.status === 'restricted' || dbUser.status === 'inactive') {
      return { error: 'This account has been suspended or restricted. Please contact support.' };
    }

    // Determine site URL dynamically from headers to handle dynamic environments
    const headersList = await headers();
    const host = headersList.get('host');
    const proto = headersList.get('x-forwarded-proto') || 'http';
    const siteUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    const redirectUrl = `${siteUrl}/api/auth/callback?next=/reset-password`;

    // Generate secure recovery link using Supabase Admin (bypasses Supabase SMTP entirely)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: dbUser.email || email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkErr) {
      console.warn('[Password Reset] generateLink notice:', linkErr.message);
      return { error: linkErr.message || 'Unable to generate password reset link. Please try again.' };
    }

    const tokenHash = linkData?.properties?.hashed_token;
    // Prefer direct server callback link with token_hash so verifyOtp sets session cookies server-side
    const resetLink = tokenHash
      ? `${siteUrl}/api/auth/callback?token_hash=${tokenHash}&type=recovery&next=/reset-password`
      : linkData?.properties?.action_link;

    if (resetLink) {
      const mailRes = await sendPasswordResetEmailViaMailhive({
        to: email,
        resetUrl: resetLink,
      });

      if (!mailRes.success && mailRes.error) {
        return { error: mailRes.error };
      }
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

    // Sign out user session so that they must explicitly log in with the new password
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An error occurred during password change.' };
  }
}

