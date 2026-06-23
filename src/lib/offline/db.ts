import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  sku: string;
  default_price: number;
  business_id: string;
}

export interface LocalInventory {
  product_id: string;
  branch_id: string;
  quantity: number;
  business_id: string;
}

export interface LocalCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  branch_id: string;
  business_id: string;
  total_spend: number;
}

export interface LocalSale {
  id: string;
  branch_id: string;
  customer_id: string | null;
  payment_method: string;
  items: { product_id: string; quantity: number }[];
  status: 'pending' | 'sync_conflict' | 'failed';
  error_reason?: string;
  created_at: string;
}

export interface SyncQueueItem {
  id?: number;
  type: 'SALE_CREATED' | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED';
  payload: any;
  status: 'queued' | 'processing' | 'failed' | 'sync_conflict';
  error_message?: string;
  created_at: string;
}

class OfflineDatabase extends Dexie {
  products!: Table<LocalProduct>;
  inventory!: Table<LocalInventory>;
  customers!: Table<LocalCustomer>;
  pending_sales!: Table<LocalSale>;
  sync_queue!: Table<SyncQueueItem>;

  constructor() {
    super('TraderERPOfflineDB');
    this.version(1).stores({
      products: 'id, name, sku',
      inventory: '[product_id+branch_id], product_id, branch_id',
      customers: 'id, name, phone, branch_id',
      pending_sales: 'id, status, created_at',
      sync_queue: '++id, type, status'
    });
  }
}

export const db = new OfflineDatabase();
