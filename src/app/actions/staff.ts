'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Helper: initialize Supabase Admin Client
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

import { validateWriteAccess } from '@/lib/security';

// 1. Re-authenticate administrator before staff creation modal opens
export async function verifyAdminPassword(password: string) {
  if (!password) {
    return { error: 'Password is required.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user || !user.email) {
      return { error: 'Authentication required. Please log in again.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    // Attempt sign-in with the current user's email and password to verify password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    if (signInErr) {
      return { error: 'Incorrect password. Please try again.' };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An error occurred during password validation.' };
  }
}

// 2. Create Staff Account
export async function createStaff(data: {
  name: string;
  email: string;
  phone: string;
  role: string;
  branchIds: string[];
  tempPassword: string;
}) {
  const { name, email, phone, role, branchIds, tempPassword } = data;

  if (!name || !email || !phone || !role || branchIds.length === 0 || !tempPassword) {
    return { error: 'All fields are required and at least one branch must be assigned.' };
  }

  if (role === 'OWNER') {
    return { error: 'Cannot assign OWNER role via this screen.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user: adminUser }, error: adminErr } = await supabase.auth.getUser();

    if (adminErr || !adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied. Only business Owners and Admins can create staff.' };
    }

    const supabaseAdmin = getAdminClient();

    // SECURITY CHECK: Verify all assigned branches belong to the admin's business
    const { data: validBranches, error: branchCheckErr } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('business_id', businessId)
      .in('id', branchIds);

    if (branchCheckErr || !validBranches || validBranches.length !== branchIds.length) {
      return { error: 'One or more assigned branches do not belong to your business workspace.' };
    }

    // Create user in Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        business_id: businessId,
        role: role,
        status: 'ACTIVE',
        must_change_password: true
      },
      user_metadata: {
        name,
        phone
      }
    });

    if (createError || !newUser?.user) {
      return { error: createError?.message || 'Failed to create account.' };
    }

    const newUserId = newUser.user.id;

    try {
      // Upsert profile in public.users to ensure consistency (handles trigger failure case)
      const { error: profileErr } = await supabaseAdmin
        .from('users')
        .upsert({
          id: newUserId,
          business_id: businessId,
          name,
          email,
          role,
          status: 'ACTIVE',
          must_change_password: true,
          phone
        });

      if (profileErr) {
        throw new Error(`Profile insert failed: ${profileErr.message}`);
      }

      // Link branch assignments in public.user_branches
      const branchRecords = branchIds.map((branchId) => ({
        user_id: newUserId,
        branch_id: branchId,
        business_id: businessId
      }));

      const { error: branchErr } = await supabaseAdmin
        .from('user_branches')
        .insert(branchRecords);

      if (branchErr) {
        throw new Error(`Branch assignments failed: ${branchErr.message}`);
      }

    } catch (dbErr: any) {
      // Clean up/rollback auth user on DB failure
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return { error: dbErr.message || 'Database registration failed. Rollback triggered.' };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred.' };
  }
}

// 3. Edit Staff Account
export async function editStaff(
  userId: string,
  data: {
    name: string;
    phone: string;
    role: string;
    branchIds: string[];
  }
) {
  const { name, phone, role, branchIds } = data;

  if (!name || !phone || !role || branchIds.length === 0) {
    return { error: 'Full name, phone, role, and branch assignments are required.' };
  }

  if (role === 'OWNER') {
    return { error: 'Cannot assign OWNER role via this screen.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check to bypass JWT status caching latency
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // SECURITY CHECK: Verify all assigned branches belong to the admin's business
    const { data: validBranches, error: branchCheckErr } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('business_id', businessId)
      .in('id', branchIds);

    if (branchCheckErr || !validBranches || validBranches.length !== branchIds.length) {
      return { error: 'One or more assigned branches do not belong to your business workspace.' };
    }

    // Verify target user belongs to the same business
    const { data: targetUser, error: queryErr } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (queryErr || !targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Cannot modify Owner profiles.' };
    }

    // 1. Update auth settings
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role },
      user_metadata: { name, phone }
    });

    if (authErr) {
      return { error: `Auth update failed: ${authErr.message}` };
    }

    // 2. Update public.users record
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ name, phone, role })
      .eq('id', userId);

    if (dbErr) {
      return { error: `Profile update failed: ${dbErr.message}` };
    }

    // 3. Update branch assignments
    // Delete old links
    const { error: delErr } = await supabaseAdmin
      .from('user_branches')
      .delete()
      .eq('user_id', userId);

    if (delErr) {
      return { error: `Failed to reset branch assignments: ${delErr.message}` };
    }

    // Insert new links
    const branchRecords = branchIds.map((branchId) => ({
      user_id: userId,
      branch_id: branchId,
      business_id: businessId
    }));

    const { error: addErr } = await supabaseAdmin
      .from('user_branches')
      .insert(branchRecords);

    if (addErr) {
      return { error: `Failed to update branch assignments: ${addErr.message}` };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred during update.' };
  }
}

// 4. Suspend User
export async function suspendStaff(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target is same business and not Owner
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Cannot suspend Owners.' };
    }

    // Update Auth app_metadata to SUSPENDED
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'SUSPENDED' }
    });

    if (authErr) {
      return { error: authErr.message };
    }

    // Update public.users database status to SUSPENDED
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'SUSPENDED' })
      .eq('id', userId);

    if (dbErr) {
      return { error: dbErr.message };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message };
  }
}

// 5. Activate User
export async function activateStaff(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target is same business and not Owner
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    // Update Auth app_metadata to ACTIVE
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'ACTIVE' }
    });

    if (authErr) {
      return { error: authErr.message };
    }

    // Update public.users database status to ACTIVE
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'ACTIVE' })
      .eq('id', userId);

    if (dbErr) {
      return { error: dbErr.message };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message };
  }
}

// 6. Reset Staff Password (OWNER and ADMIN only)
export async function resetStaffPassword(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Cannot reset Owner passwords.' };
    }

    // Generate random 10-char alphanumeric temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure complexity rules: at least one capital, one digit, one character
    tempPassword += 'A1!';

    // Update password and metadata in auth
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      app_metadata: {
        must_change_password: true
      }
    });

    if (authErr) {
      return { error: `Auth password update failed: ${authErr.message}` };
    }

    // Update database profile must_change_password state
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (dbErr) {
      return { error: `Database state update failed: ${dbErr.message}` };
    }

    revalidatePath('/staff');
    return { success: true, tempPassword };

  } catch (err: any) {
    return { error: err.message };
  }
}

// 7. Change User's Password (Self service on first login)
export async function changeUserPassword(formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmNewPassword = formData.get('confirmNewPassword') as string;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
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
      return { error: 'Session not found. Please log in again.' };
    }

    // Live security check for read access (suspended or deleted users blocked)
    const { validateReadAccess } = await import('@/lib/security');
    try {
      await validateReadAccess(supabase, user.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    // Verify current password first by doing a sign-in check
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInErr) {
      return { error: 'Incorrect current password.' };
    }

    // Update to the new password using the active authenticated client
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateErr) {
      return { error: updateErr.message };
    }

    // Update must_change_password to false in public.users and auth app_metadata
    const supabaseAdmin = getAdminClient();

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        must_change_password: false
      }
    });

    if (authErr) {
      return { error: `Failed to update metadata cache: ${authErr.message}` };
    }

    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ must_change_password: false })
      .eq('id', user.id);

    if (dbErr) {
      return { error: `Failed to save password change status: ${dbErr.message}` };
    }

    // Sign in the user again with the new password to refresh their session cookies and JWT claims
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: newPassword
    });

    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred during password change.' };
  }
}

// 8. Restrict Staff Account (View-Only / Block Write Operations)
export async function restrictStaff(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target user is in same business
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Cannot restrict Owners.' };
    }

    // 1. Update Auth app_metadata status to RESTRICTED
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'RESTRICTED' }
    });

    if (authErr) {
      return { error: `Failed to update auth status: ${authErr.message}` };
    }

    // 2. Update database status to RESTRICTED
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'RESTRICTED' })
      .eq('id', userId);

    if (dbErr) {
      return { error: `Failed to update database status: ${dbErr.message}` };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred during restriction.' };
  }
}

// 9. Remove Restriction (Set back to ACTIVE)
export async function unrestrictStaff(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target user is in same business
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found.' };
    }

    // 1. Update Auth app_metadata status to ACTIVE
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { status: 'ACTIVE' }
    });

    if (authErr) {
      return { error: `Failed to update auth status: ${authErr.message}` };
    }

    // 2. Update database status to ACTIVE
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'ACTIVE' })
      .eq('id', userId);

    if (dbErr) {
      return { error: `Failed to update database status: ${dbErr.message}` };
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred.' };
  }
}

// 10. Delete Staff (Soft-delete: delete Auth account to block login, set public.users status to DELETED to preserve audit records)
export async function deleteStaff(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return { error: 'Not authenticated.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, adminUser.id);
    } catch (accessErr: any) {
      return { error: accessErr.message };
    }

    const businessId = adminUser.app_metadata?.business_id;
    const adminRole = adminUser.app_metadata?.role;

    if (!businessId || (adminRole !== 'OWNER' && adminRole !== 'ADMIN')) {
      return { error: 'Access denied.' };
    }

    const supabaseAdmin = getAdminClient();

    // Verify target user is in same business
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('business_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.business_id !== businessId) {
      return { error: 'User not found in your business.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Cannot delete Owner accounts.' };
    }

    // 1. Delete branch assignments first to clean up access mapping
    await supabaseAdmin.from('user_branches').delete().eq('user_id', userId);

    // 2. Set status to 'DELETED' in public.users database (preserving transaction reference history)
    const { error: dbErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'DELETED' })
      .eq('id', userId);

    if (dbErr) {
      return { error: `Failed to update profile to DELETED: ${dbErr.message}` };
    }

    // 3. Delete from Supabase Auth so they can never log in or restore session again
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.warn('Auth account delete warning (may already be deleted):', authErr.message);
    }

    revalidatePath('/staff');
    return { success: true };

  } catch (err: any) {
    return { error: err.message || 'An error occurred during deletion.' };
  }
}
