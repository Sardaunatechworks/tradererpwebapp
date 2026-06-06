import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.' 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let migrationStatus = 'applied';
    let errorMessage = null;
    let rawFetchStatus = null;
    let rawFetchError = null;

    try {
      const rawRes = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        }
      });
      rawFetchStatus = rawRes.status;
      if (!rawRes.ok) {
        rawFetchError = await rawRes.text();
      }
    } catch (fetchErr: any) {
      rawFetchError = fetchErr.stack || fetchErr.message;
    }

    let publicUsersList = [];
    let installedTriggers = [];
    try {
      const { data, error: dbErr } = await supabaseAdmin
        .from('users')
        .select('*');

      if (dbErr) {
        migrationStatus = 'missing_or_failed';
        errorMessage = dbErr.message;
      } else {
        publicUsersList = data || [];
      }    } catch (dbErr: any) {
      migrationStatus = 'error';
      errorMessage = dbErr.stack || dbErr.message;
    }

    // 2. Setup standard test users
    // Let's create an Owner test user: owner@tradererp.com / Password123!
    const testEmail = 'owner@tradererp.com';
    const testPassword = 'Password123!';

    // Delete existing user if any, to avoid conflicts
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === testEmail);

    if (existingUser) {
      // Deleting user will cascade delete public.users if references are active
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // Create the test user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'John Doe Owner'
      }
    });

    if (createError || !newUser?.user) {
      return NextResponse.json({
        migrationStatus,
        tablesError: errorMessage,
        userCreationError: createError?.message || 'Failed to create user'
      }, { status: 500 });
    }

    // Manually ensure the owner user is in public.users table (fallback for trigger)
    const { error: insertOwnerErr } = await supabaseAdmin
      .from('users')
      .upsert({
        id: newUser.user.id,
        email: testEmail,
        name: 'John Doe Owner',
        role: 'OWNER',
        status: 'active'
      });

    if (insertOwnerErr) {
      return NextResponse.json({
        migrationStatus,
        tablesError: errorMessage,
        userCreationError: `Failed to insert user profile: ${insertOwnerErr.message}`
      }, { status: 500 });
    }

    // Check if we also need to register a super admin
    const adminEmail = 'admin@tradererp.com';
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);
    if (existingAdmin) {
      await supabaseAdmin.auth.admin.deleteUser(existingAdmin.id);
    }

    const { data: newAdmin, error: createAdminError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Super Administrator'
      },
      app_metadata: {
        role: 'super_admin'
      }
    });

    return NextResponse.json({
      success: true,
      migrationStatus,
      tablesError: errorMessage,
      rawFetchStatus,
      rawFetchError,
      publicUsersList,
      ownerUser: {
        email: testEmail,
        id: newUser.user.id,
        email_confirmed: newUser.user.email_confirmed_at
      },
      adminUser: {
        email: adminEmail,
        id: newAdmin?.user?.id,
        role: newAdmin?.user?.app_metadata?.role
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'An error occurred during setup'
    }, { status: 500 });
  }
}
