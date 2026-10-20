'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingCart,
  AlertTriangle,
  CreditCard,
  ShieldAlert,
  Info,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { InAppNotification, NotificationCategory } from '@/types/notification';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/app/actions/notifications';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const CATEGORY_META: Record<
  NotificationCategory,
  { icon: React.ReactNode; color: string }
> = {
  sale: {
    icon: <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  inventory: {
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
    color: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  credit: {
    icon: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
    color: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  security: {
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
    color: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  system: {
    icon: <Info className="w-3.5 h-3.5 text-slate-600" />,
    color: 'bg-slate-50 text-slate-700 border-slate-100',
  },
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);

  // Initial fetch of unread count and first batch
  const loadNotifications = async (targetPage = 1, append = false) => {
    setIsLoading(true);
    try {
      const res = await getNotifications({
        page: targetPage,
        limit: 8,
        unreadOnly: filterUnread,
      });

      if (append) {
        setNotifications((prev) => [...prev, ...res.notifications]);
      } else {
        setNotifications(res.notifications);
      }

      setUnreadCount(res.unreadCount);
      setHasMore(res.notifications.length === 8 && res.total > targetPage * 8);
      setPage(targetPage);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, false);
    // Periodically refresh unread count every 90 seconds (sensible on-demand refresh)
    const interval = setInterval(() => {
      if (!document.hidden) {
        getNotifications({ page: 1, limit: 1 }).then((r) => setUnreadCount(r.unreadCount));
      }
    }, 90000);

    return () => clearInterval(interval);
  }, [filterUnread]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    startTransition(async () => {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  };

  const handleMarkAllRead = async () => {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) {
            loadNotifications(1, false);
          }
        }}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        aria-label="View in-app notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none animate-in zoom-in-75">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications Panel"
          className="fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterUnread((v) => !v)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  filterUnread
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                {filterUnread ? 'Unread only' : 'All'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mb-1.5 text-blue-600" />
                <span className="text-xs">Checking notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Bell className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No {filterUnread ? 'unread' : 'recent'} notifications found.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.system;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50/80 ${
                      !item.is_read ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg border shrink-0 mt-0.5 ${meta.color}`}
                    >
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          className={`text-xs ${
                            !item.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                          } truncate`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        {item.payload?.link && (
                          <Link
                            href={item.payload.link}
                            onClick={() => {
                              if (!item.is_read) handleMarkAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                          >
                            <span>View details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}

                        {!item.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(item.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer ml-auto"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Load More */}
          {hasMore && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
              <button
                onClick={() => loadNotifications(page + 1, true)}
                disabled={isLoading}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 p-1 w-full text-center cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Loading older...' : 'Load older notifications'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
