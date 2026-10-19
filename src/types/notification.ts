export type NotificationCategory =
  | 'sale'
  | 'inventory'
  | 'credit'
  | 'security'
  | 'system';

export interface NotificationPayload {
  link?: string;
  recordId?: string;
  amount?: number;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface InAppNotification {
  id: string;
  business_id: string;
  user_id: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  payload: NotificationPayload;
  is_read: boolean;
  created_at: string;
}
