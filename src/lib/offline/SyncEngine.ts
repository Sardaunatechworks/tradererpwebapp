import { db, type SyncQueueItem, type LocalSale } from './db';
import { createSale } from '@/app/actions/sales';
import { createCustomer } from '@/app/actions/customers';
import { registerDevice } from '@/app/actions/offline';

let isSyncing = false;

// Get or create unique device identifier
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('tradererp_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('tradererp_device_id', id);
  }
  return id;
}

// Get user device info
export function getDeviceInfo() {
  if (typeof window === 'undefined') return { name: 'Node.js Server', type: 'server' };
  const userAgent = navigator.userAgent;
  let type = 'pos_terminal';
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    type = 'mobile_register';
  }
  return {
    name: localStorage.getItem('tradererp_device_name') || `Register (${type === 'mobile_register' ? 'Mobile' : 'Desktop'})`,
    type
  };
}

export async function triggerSync(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return false;
  if (isSyncing) return false;

  isSyncing = true;
  console.log('SyncEngine: Starting auto-sync...');

  try {
    // 1. Register device to Supabase
    const deviceId = getDeviceId();
    const info = getDeviceInfo();
    const activeBranchId = localStorage.getItem('tradererp_active_branch_id');
    
    await registerDevice(deviceId, info.name, info.type, activeBranchId);

    // 2. Fetch unprocessed queue items
    const queue = await db.sync_queue
      .where('status')
      .anyOf(['queued', 'failed'])
      .toArray();

    if (queue.length === 0) {
      console.log('SyncEngine: Queue is empty.');
      isSyncing = false;
      return true;
    }

    console.log(`SyncEngine: Found ${queue.length} items to synchronize.`);

    for (const item of queue) {
      if (!item.id) continue;

      // Update queue item to processing
      await db.sync_queue.update(item.id, { status: 'processing' });

      try {
        let success = false;
        let errorMessage = '';

        if (item.type === 'SALE_CREATED') {
          const payload = item.payload as LocalSale;
          const itemsParam = payload.items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity
          }));

          const res = await createSale(
            payload.branch_id,
            payload.customer_id,
            payload.payment_method,
            itemsParam
          );

          if (res?.success) {
            success = true;
            // Mark sale as synced in pending_sales table
            await db.pending_sales.delete(payload.id); // Or update status to synced
          } else {
            errorMessage = res?.error || 'Unknown sale processing error';
          }
        } 
        else if (item.type === 'CUSTOMER_CREATED') {
          const payload = item.payload;
          const formData = new FormData();
          formData.append('name', payload.name);
          formData.append('email', payload.email || '');
          formData.append('phone', payload.phone || '');
          formData.append('branchId', payload.branch_id || 'all');

          const res = await createCustomer(formData);
          if (res?.success) {
            success = true;
          } else {
            errorMessage = res?.error || 'Unknown customer creation error';
          }
        }

        if (success) {
          // Success: Remove item from sync queue
          await db.sync_queue.delete(item.id);
        } else {
          // Logic error / Conflict check
          const isConflict = errorMessage.toLowerCase().includes('stock') || 
                             errorMessage.toLowerCase().includes('insufficient') ||
                             errorMessage.toLowerCase().includes('validation') ||
                             errorMessage.toLowerCase().includes('not belong');

          const nextStatus = isConflict ? 'sync_conflict' : 'failed';
          
          await db.sync_queue.update(item.id, {
            status: nextStatus,
            error_message: errorMessage
          });

          if (item.type === 'SALE_CREATED') {
            const payload = item.payload as LocalSale;
            await db.pending_sales.update(payload.id, {
              status: isConflict ? 'sync_conflict' : 'failed',
              error_reason: errorMessage
            });
          }
        }
      } catch (err: any) {
        console.error(`SyncEngine: Failed to process item #${item.id}:`, err);
        // Connection error - mark as failed to retry later
        await db.sync_queue.update(item.id, {
          status: 'failed',
          error_message: err.message || 'Network action dispatch exception'
        });
      }
    }

    // Trigger local state updates if callbacks are active
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tradererp_sync_completed'));
    }

  } catch (syncErr) {
    console.error('SyncEngine Exception:', syncErr);
  } finally {
    isSyncing = false;
  }

  return true;
}
