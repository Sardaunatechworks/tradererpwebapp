'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { BusinessMember, UserRole } from '@/types';

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Authentication required.');

  const businessId = user.app_metadata?.business_id;
  if (!businessId) throw new Error('No business workspace context found.');

  const role = user.app_metadata?.role || 'staff';
  return { user, businessId, role, supabase };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET STAFF MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStaffMembers(): Promise<{ data?: BusinessMember[]; error?: string }> {
  try {
    const { businessId, supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from('business_members')
      .select('*, user:users(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as BusinessMember[]) || [] };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch staff members.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE STAFF MEMBER
// ─────────────────────────────────────────────────────────────────────────────

export async function createStaffMember(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role !== 'owner' && role !== 'admin') {
      return { error: 'Only owners and administrators can add new staff members.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = (formData.get('password') as string);
    const phone = (formData.get('phone') as string)?.trim() || null;
    const staffRole = (formData.get('role') as string) || 'staff';

    if (!name || !email || !password) {
      return { error: 'Name, email, and temporary password are required.' };
    }

    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }

    const supabaseAdmin = getAdminClient();

    // 1. Create or fetch auth user
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: {
        business_id: businessId,
        role: staffRole,
      },
    });

    if (authErr) {
      return { error: `Failed to create staff account: ${authErr.message}` };
    }

    const newUserId = authUser.user.id;

    // 2. Insert into public.users
    await supabaseAdmin.from('users').upsert({
      id: newUserId,
      name,
      email,
      phone,
      status: 'active',
    });

    // 3. Insert into public.business_members
    const { error: memberErr } = await supabaseAdmin.from('business_members').insert({
      business_id: businessId,
      user_id: newUserId,
      role: staffRole as UserRole,
      status: 'active',
    });

    if (memberErr) {
      throw new Error(`Failed to assign business role: ${memberErr.message}`);
    }

    // 4. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: 'create_staff',
      entity_type: 'staff',
      entity_id: newUserId,
      metadata: { name, email, role: staffRole },
    });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to create staff member.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE STAFF STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleStaffStatus(memberId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const { businessId, user, role } = await getAuthContext();
    if (role !== 'owner' && role !== 'admin') {
      return { error: 'Only owners and admins can modify staff statuses.' };
    }

    const supabaseAdmin = getAdminClient();

    const { data: member, error: fetchErr } = await supabaseAdmin
      .from('business_members')
      .select('id, user_id, role, status')
      .eq('id', memberId)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !member) {
      return { error: 'Staff member record not found.' };
    }

    if (member.role === 'owner') {
      return { error: 'Cannot deactivate the primary business owner.' };
    }

    const nextStatus = member.status === 'active' ? 'inactive' : 'active';

    await supabaseAdmin
      .from('business_members')
      .update({ status: nextStatus })
      .eq('id', memberId);

    // Also update auth app_metadata status
    await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
      app_metadata: { status: nextStatus === 'inactive' ? 'SUSPENDED' : 'active' },
    });

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: businessId,
      user_id: user.id,
      action: nextStatus === 'inactive' ? 'suspend_staff' : 'activate_staff',
      entity_type: 'staff',
      entity_id: member.user_id,
      metadata: { memberId, status: nextStatus },
    });

    revalidatePath('/staff');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update staff status.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE OWN PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

export async function changeUserPassword(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!newPassword || newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { error: 'Passwords do not match.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to change password.' };
  }
}
