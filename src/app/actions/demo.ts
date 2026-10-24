'use server';

import { revalidatePath } from 'next/cache';
import { resetDemoStoreData } from '@/lib/demo/seed';

export async function resetDemoData(): Promise<{ success: boolean; error?: string }> {
  try {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return { success: false, error: 'Demo reset is only available in demo mode.' };
    }

    const res = await resetDemoStoreData();
    if (!res.success) {
      return { success: false, error: res.message || 'Failed to reset demo environment.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/expenses');
    revalidatePath('/customers');
    revalidatePath('/credit');
    revalidatePath('/reports');
    revalidatePath('/settings');

    return { success: true };
  } catch (err: any) {
    console.error('resetDemoData error:', err);
    return { success: false, error: err.message || 'Failed to reset demo data.' };
  }
}
