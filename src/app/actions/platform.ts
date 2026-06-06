'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Helper to get Supabase Admin client using the service role key
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Middleware verifies role === 'super_admin' to access these routes, 
// but we also double check it inside the server actions for defense in depth.
async function verifySuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'super_admin') {
    throw new Error('Unauthorized. Access restricted to Super Admins.');
  }

  return supabase;
}

/* ──────────────────────────────────────────────────────────────────────────
   1. BUSINESS MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
export async function getPlatformBusinesses() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching platform businesses:', error);
    return [];
  }
  return data || [];
}

export async function setBusinessStatus(businessId: string, status: 'active' | 'suspended') {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('businesses')
    .update({ status })
    .eq('id', businessId);

  if (error) {
    return { error: error.message };
  }

  // Also update statuses of all users in this business in auth.users app_metadata
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('business_id', businessId);

    if (users) {
      for (const u of users) {
        await supabaseAdmin.auth.admin.updateUserById(u.id, {
          app_metadata: { status: status === 'suspended' ? 'SUSPENDED' : 'ACTIVE' }
        });
        await supabaseAdmin.from('users').update({ status }).eq('id', u.id);
      }
    }
  } catch (err) {
    console.error('Sync business status to users app_metadata failed:', err);
  }

  revalidatePath('/platform');
  return { success: true };
}

export async function deleteBusiness(businessId: string) {
  const supabase = await verifySuperAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Get all users belonging to this business
  const { data: users, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('business_id', businessId);

  if (userErr) {
    return { error: `Failed to locate business users: ${userErr.message}` };
  }

  // 2. Delete users from auth.users (cascade will delete from public.users)
  if (users) {
    for (const u of users) {
      const { error: delUserErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (delUserErr) {
        console.error(`Error deleting user ${u.id} from Auth:`, delUserErr);
      }
    }
  }

  // 3. Delete the business itself
  const { error: bizErr } = await supabaseAdmin
    .from('businesses')
    .delete()
    .eq('id', businessId);

  if (bizErr) {
    return { error: `Failed to delete business profile: ${bizErr.message}` };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   2. USER MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
export async function getPlatformUsers() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('users')
    .select('*, business:businesses(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching platform users:', error);
    return [];
  }
  return data || [];
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended') {
  const supabase = await verifySuperAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Update app_metadata for JWT/middleware check
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { status: status === 'suspended' ? 'SUSPENDED' : 'ACTIVE' }
  });

  if (authErr) {
    return { error: `Auth update failed: ${authErr.message}` };
  }

  // 2. Update public.users database profile
  const { error: dbErr } = await supabaseAdmin
    .from('users')
    .update({ status })
    .eq('id', userId);

  if (dbErr) {
    return { error: `Database status update failed: ${dbErr.message}` };
  }

  revalidatePath('/platform');
  return { success: true };
}

export async function resetUserAccess(userId: string) {
  const supabase = await verifySuperAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  // Update app_metadata to force change password on next visit
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { must_change_password: true }
  });

  if (error) {
    return { error: `Access reset failed: ${error.message}` };
  }

  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   3. ROLE & PERMISSION MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
export async function getGlobalPermissions() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('global_permissions')
    .select('*')
    .order('role');

  if (error) {
    console.error('Error fetching global permissions:', error);
    return [];
  }
  return data || [];
}

export async function toggleGlobalPermission(role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF', permission: string, grant: boolean) {
  const supabase = await verifySuperAdmin();
  
  if (grant) {
    const { error } = await supabase
      .from('global_permissions')
      .insert({ role, permission });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('global_permissions')
      .delete()
      .eq('role', role)
      .eq('permission', permission);
    if (error) return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   4. SUPPORT CENTER
   ────────────────────────────────────────────────────────────────────────── */
export async function getSupportTickets() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, business:businesses(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching support tickets:', error);
    return [];
  }
  return data || [];
}

export async function updateTicketStatus(ticketId: string, status: 'open' | 'resolved' | 'closed', adminResponse?: string) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('support_tickets')
    .update({ 
      status, 
      admin_response: adminResponse || null, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', ticketId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

export async function createSupportTicket(title: string, description: string, category: 'support' | 'complaint' | 'feedback' | 'contact_request', contactEmail: string) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('support_tickets')
    .insert({ title, description, category, contact_email: contactEmail });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   5. ANNOUNCEMENTS & NOTIFICATIONS
   ────────────────────────────────────────────────────────────────────────── */
export async function getAnnouncements() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
  return data || [];
}

export async function createAnnouncement(title: string, content: string, type: 'announcement' | 'broadcast' | 'notification') {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('announcements')
    .insert({ title, content, type });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   6. EMAIL MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
export async function getEmailLogs() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email logs:', error);
    return [];
  }
  return data || [];
}

export async function sendPlatformEmail(toEmail: string, subject: string, templateName: string) {
  const supabase = await verifySuperAdmin();
  
  // Real insertion of email log into database
  const { error } = await supabase
    .from('email_logs')
    .insert({
      to_email: toEmail,
      subject,
      template_name: templateName,
      status: 'sent'
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   7. CONTENT MANAGEMENT (FAQs)
   ────────────────────────────────────────────────────────────────────────── */
export async function getFAQs() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching FAQs:', error);
    return [];
  }
  return data || [];
}

export async function createFAQ(question: string, answer: string) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('faq')
    .insert({ question, answer });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

export async function deleteFAQ(faqId: string) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('faq')
    .delete()
    .eq('id', faqId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   8. PLATFORM SETTINGS & BRANDING
   ────────────────────────────────────────────────────────────────────────── */
export async function getPlatformSettings() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*');

  if (error) {
    console.error('Error fetching platform settings:', error);
    return [];
  }
  return data || [];
}

export async function updatePlatformSettings(key: string, value: any) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   9. DEVELOPER TOOLS (FEATURE FLAGS)
   ────────────────────────────────────────────────────────────────────────── */
export async function getFeatureFlags() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('key');

  if (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
  return data || [];
}

export async function toggleFeatureFlag(key: string, isEnabled: boolean) {
  const supabase = await verifySuperAdmin();
  const { error } = await supabase
    .from('feature_flags')
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/platform');
  return { success: true };
}

/* ──────────────────────────────────────────────────────────────────────────
   10. AUDIT LOGS
   ────────────────────────────────────────────────────────────────────────── */
export async function getAuditLogs() {
  const supabase = await verifySuperAdmin();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, user:users(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
  return data || [];
}

export async function createAuditLog(action: string, category: 'user_activity' | 'business_activity' | 'security_event' | 'system_event', details: any = {}) {
  const supabase = await verifySuperAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user?.id || null,
      action,
      category,
      details
    });

  if (error) {
    console.error('Failed to create audit log:', error);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   11. ANALYTICS & STATISTICS
   ────────────────────────────────────────────────────────────────────────── */
export async function getPlatformStats() {
  const supabase = await verifySuperAdmin();

  // Businesses Stats
  const { data: businesses, error: bizErr } = await supabase
    .from('businesses')
    .select('id, status, created_at');

  // Users Stats
  const { data: users, error: usrErr } = await supabase
    .from('users')
    .select('id, status, created_at');

  if (bizErr || usrErr || !businesses || !users) {
    console.error('Error calculating platform statistics');
    return { totalBusinesses: 0, activeBusinesses: 0, suspendedBusinesses: 0, totalUsers: 0, activeUsers: 0, suspendedUsers: 0 };
  }

  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter(b => b.status === 'active').length;
  const suspendedBusinesses = businesses.filter(b => b.status === 'suspended').length;

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const suspendedUsers = users.filter(u => u.status === 'suspended').length;

  return {
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses,
    totalUsers,
    activeUsers,
    suspendedUsers
  };
}
