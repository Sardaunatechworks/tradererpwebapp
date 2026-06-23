'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateWriteAccess } from '@/lib/security';

export async function registerDevice(
  deviceId: string,
  deviceName: string,
  deviceType: string,
  branchId: string | null
) {
  try {
    if (!deviceId || !deviceName) {
      return { error: 'Device details are required.' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Authentication required.' };
    }

    // Live security check
    try {
      await validateWriteAccess(supabase, user.id);
    } catch (err: any) {
      return { error: err.message };
    }

    const businessId = user.app_metadata?.business_id;
    if (!businessId) {
      return { error: 'No business context found.' };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from('devices')
      .upsert({
        id: deviceId,
        business_id: businessId,
        branch_id: branchId || null,
        device_name: deviceName,
        device_type: deviceType,
        last_sync: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Failed to register device:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Register Device Global Exception:', err);
    return { error: err.message || 'Server action execution failed.' };
  }
}
