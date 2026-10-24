'use server';

import { InAppNotification, NotificationCategory, NotificationPayload } from '@/types/notification';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/auth/context';

/**
 * Fetch paginated notifications for current tenant user
 */
export async function getNotifications({
  page = 1,
  limit = 10,
  unreadOnly = false,
}: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
} = {}): Promise<{
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}> {
  try {
    const { supabase, user, businessId } = await getAuthContext();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Base query scoped to tenant and recipient
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.warn('Could not query notifications (table might not exist yet):', error.message);
      return { notifications: [], total: 0, unreadCount: 0 };
    }

    // Unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_read', false)
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (countError) {
      console.warn('Error counting unread notifications:', countError.message);
    }

    return {
      notifications: (data as InAppNotification[]) || [],
      total: count || 0,
      unreadCount: unreadCount || 0,
    };
  } catch (err: any) {
    console.error('Failed to get notifications:', err);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

/**
 * Get quick count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { supabase, user, businessId } = await getAuthContext();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('is_read', false)
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (error) {
      return 0;
    }
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user, businessId } = await getAuthContext();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('business_id', businessId)
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user, businessId } = await getAuthContext();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('business_id', businessId)
      .eq('is_read', false)
      .or(`user_id.is.null,user_id.eq.${user.id}`);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Authoritative notification creator
 * Can be called server-side when sales, inventory alerts, or customer debt events occur.
 */
export async function createNotification({
  title,
  message,
  category,
  payload = {},
  targetUserId,
}: {
  title: string;
  message: string;
  category: NotificationCategory;
  payload?: NotificationPayload;
  targetUserId?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const { supabase, businessId } = await getAuthContext();

    // Prevent duplicate alerts in a short window (e.g. repeated low stock notification within 1 hour)
    if (category === 'inventory' && payload.recordId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('business_id', businessId)
        .eq('category', 'inventory')
        .gte('created_at', oneHourAgo)
        .contains('payload', { recordId: payload.recordId })
        .limit(1);

      if (existing && existing.length > 0) {
        return { success: true, notificationId: existing[0].id };
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        business_id: businessId,
        user_id: targetUserId || null,
        title,
        message,
        category,
        payload,
        is_read: false,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
