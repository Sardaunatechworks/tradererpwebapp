'use server';

import { createClient } from '@/lib/supabase/server';
import { getSuperAdminContext } from '@/app/actions/admin';
import { Announcement, AnnouncementFormData } from '@/types/announcement';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// TENANT OPERATIONS (Read active announcements & persist dismissals)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves active published announcements visible to the current tenant user,
 * filtering out any announcements the user has already dismissed.
 */
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return [];
    }

    const userRole = user.app_metadata?.role || 'staff';
    const now = new Date().toISOString();

    // 1. Fetch user's dismissed announcement IDs
    const { data: dismissals } = await supabase
      .from('announcement_dismissals')
      .select('announcement_id')
      .eq('user_id', user.id);

    const dismissedIds = (dismissals || []).map((d) => d.announcement_id);

    // 2. Fetch published announcements
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .lte('starts_at', now)
      .order('created_at', { ascending: false });

    const { data: announcements, error: annErr } = await query;

    if (annErr) {
      console.warn('Could not query announcements table:', annErr.message);
      return [];
    }

    if (!announcements) return [];

    // 3. Filter by expiration, audience, and dismissed state in application layer
    const filtered = (announcements as Announcement[]).filter((a) => {
      // Expiration check
      if (a.expires_at && new Date(a.expires_at).getTime() <= Date.now()) {
        return false;
      }

      // Audience check
      if (a.target_audience === 'owners' && !['owner', 'admin', 'super_admin'].includes(userRole)) {
        return false;
      }
      if (a.target_audience === 'staff' && userRole !== 'staff') {
        return false;
      }

      // Dismissal check (maintenance alerts are never suppressed by previous dismissals)
      if (a.severity !== 'maintenance' && dismissedIds.includes(a.id)) {
        return false;
      }

      return true;
    });

    return filtered;
  } catch (err) {
    console.error('Failed to get active announcements:', err);
    return [];
  }
}

/**
 * Persist dismissal of an announcement for current user
 */
export async function dismissAnnouncement(announcementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('announcement_dismissals')
      .upsert(
        {
          announcement_id: announcementId,
          user_id: user.id,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'announcement_id,user_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM OWNER OPERATIONS (Super Admin CRUD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List all announcements for Platform Console
 */
export async function getAdminAnnouncements(): Promise<Announcement[]> {
  const { supabaseAdmin } = await getSuperAdminContext();

  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load announcements: ${error.message}`);
  }

  return (data as Announcement[]) || [];
}

/**
 * Create a new announcement (draft, scheduled, or published)
 */
export async function createAnnouncement(
  formData: AnnouncementFormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { user, supabaseAdmin } = await getSuperAdminContext();

    if (!formData.title?.trim() || !formData.content?.trim()) {
      return { success: false, error: 'Title and content are required' };
    }

    const now = new Date().toISOString();
    const startsAt = formData.starts_at || now;

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title: formData.title.trim(),
        content: formData.content.trim(),
        severity: formData.severity,
        status: formData.status,
        target_audience: formData.target_audience,
        starts_at: startsAt,
        expires_at: formData.expires_at || null,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(
  id: string,
  formData: Partial<AnnouncementFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (formData.title !== undefined) updatePayload.title = formData.title.trim();
    if (formData.content !== undefined) updatePayload.content = formData.content.trim();
    if (formData.severity !== undefined) updatePayload.severity = formData.severity;
    if (formData.status !== undefined) updatePayload.status = formData.status;
    if (formData.target_audience !== undefined) updatePayload.target_audience = formData.target_audience;
    if (formData.starts_at !== undefined) updatePayload.starts_at = formData.starts_at;
    if (formData.expires_at !== undefined) updatePayload.expires_at = formData.expires_at || null;

    const { error } = await supabaseAdmin
      .from('announcements')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Quick-archive an announcement
 */
export async function archiveAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { error } = await supabaseAdmin
      .from('announcements')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete an announcement permanently
 */
export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabaseAdmin } = await getSuperAdminContext();

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
