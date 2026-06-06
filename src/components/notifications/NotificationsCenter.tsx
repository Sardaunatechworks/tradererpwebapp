'use client';

import React, { useState } from 'react';
import { Megaphone, Globe, AlertCircle, BellRing, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'broadcast' | 'notification';
  created_at: string;
}

interface Props {
  initialNotifications: Notification[];
}

type FilterType = 'all' | 'announcement' | 'broadcast' | 'notification';

export default function NotificationsCenter({ initialNotifications }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' 
    ? initialNotifications 
    : initialNotifications.filter(n => n.type === filter);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-400" />;
      case 'broadcast':
        return <Globe className="w-5 h-5 text-purple-400" />;
      case 'notification':
        return <AlertCircle className="w-5 h-5 text-emerald-400" />;
      default:
        return <BellRing className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBgStyle = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-600/10 border-blue-500/20';
      case 'broadcast':
        return 'bg-purple-600/10 border-purple-500/20';
      case 'notification':
        return 'bg-emerald-600/10 border-emerald-500/20';
      default:
        return 'bg-slate-900/40 border-slate-800/40';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return 'Dashboard Banner';
      case 'broadcast':
        return 'Global Broadcast';
      case 'notification':
        return 'System Alert';
      default:
        return 'General';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Filters */}
      <div className="flex bg-slate-900/60 border border-slate-800 rounded-xl p-1 gap-1 w-full max-w-md">
        {(['all', 'announcement', 'broadcast', 'notification'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filter === type
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {type === 'all' ? 'All' : type === 'announcement' ? 'Banner' : type === 'broadcast' ? 'Broadcast' : 'Alert'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">No notifications found</p>
              <p className="text-xs text-slate-500 mt-1">
                You have completely caught up on all system notifications.
              </p>
            </div>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`border rounded-2xl p-5 md:p-6 transition-all duration-300 flex items-start gap-4 md:gap-5 hover:translate-x-0.5 ${getBgStyle(n.type)}`}
            >
              {/* Type Icon Context */}
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                {getIcon(n.type)}
              </div>

              {/* Message Details */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight truncate pr-2">
                    {n.title}
                  </h3>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-medium leading-relaxed break-words whitespace-pre-wrap">
                  {n.content}
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    n.type === 'announcement'
                      ? 'border-blue-500/25 text-blue-400 bg-blue-500/5'
                      : n.type === 'broadcast'
                      ? 'border-purple-500/25 text-purple-400 bg-purple-500/5'
                      : 'border-emerald-500/25 text-emerald-400 bg-emerald-500/5'
                  }`}>
                    {getTypeLabel(n.type)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
