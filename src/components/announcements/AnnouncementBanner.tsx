'use client';

import React, { useState, useEffect } from 'react';
import { Announcement } from '@/types/announcement';
import { getActiveAnnouncements, dismissAnnouncement } from '@/app/actions/announcements';
import { AlertCircle, AlertTriangle, Info, X, Wrench } from 'lucide-react';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    getActiveAnnouncements().then((data) => {
      if (isMounted && data) {
        setAnnouncements(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = async (id: string, isMaintenance = false) => {
    setDismissedIds((prev) => [...prev, id]);
    if (!isMaintenance) {
      await dismissAnnouncement(id);
    }
  };

  const activeItems = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (activeItems.length === 0) return null;

  return (
    <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {activeItems.map((item) => {
        if (item.severity === 'maintenance') {
          return (
            <div
              key={item.id}
              role="alert"
              className="relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-950 shadow-xs"
            >
              <div className="p-1.5 rounded-lg bg-rose-200/80 text-rose-700 shrink-0 mt-0.5">
                <Wrench className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded">
                    Service Notice
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-rose-950">
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <button
                onClick={() => handleDismiss(item.id, true)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss service announcement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        if (item.severity === 'important') {
          return (
            <div
              key={item.id}
              role="alert"
              className="relative flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 shadow-2xs"
            >
              <div className="p-1.5 rounded-lg bg-amber-200/70 text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                    Important
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    {item.title}
                  </h4>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <button
                onClick={() => handleDismiss(item.id)}
                className="text-amber-400 hover:text-amber-700 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss announcement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        // Info severity
        return (
          <div
            key={item.id}
            role="status"
            className="relative flex items-start gap-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 text-blue-950 shadow-2xs"
          >
            <div className="p-1.5 rounded-lg bg-blue-200/70 text-blue-700 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                  Update
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-blue-950">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                {item.content}
              </p>
            </div>

            <button
              onClick={() => handleDismiss(item.id)}
              className="text-blue-400 hover:text-blue-700 p-1 rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
