import React from 'react';
import { getUserNotifications } from '@/app/actions/notifications';
import NotificationsCenter from '@/components/notifications/NotificationsCenter';

export const metadata = {
  title: 'Notifications – TraderERP',
  description: 'View workspace notifications and system broadcasts from the platform owner.',
};

export default async function NotificationsPage() {
  const notifications = await getUserNotifications();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight leading-none">Notifications Hub</h2>
        <p className="text-xs text-slate-500 mt-2">
          Read broadcasts, system alerts, and workspace notices from the platform administrator.
        </p>
      </div>

      <NotificationsCenter initialNotifications={notifications} />
    </div>
  );
}
