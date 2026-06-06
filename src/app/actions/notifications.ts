'use server';

import { createClient } from '@/lib/supabase/server';

export async function getUserNotifications() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user notifications:', error.message);
    return [];
  }

  return data || [];
}
