'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const CHECK_INTERVAL_MS = 10 * 1000; // 10 seconds
const STORAGE_KEY = 'tradererp_last_activity';

export default function SessionActivityGuard() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return; // Do not auto-logout grant judges
    }

    const supabase = createClient();

    // Initialize activity timestamp
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    // Function to update interaction time
    const updateActivity = () => {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    };

    // Event listeners for user interaction
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check loop
    const interval = setInterval(async () => {
      const lastActivityStr = localStorage.getItem(STORAGE_KEY);
      if (!lastActivityStr) return;

      const lastActivity = parseInt(lastActivityStr, 10);
      const now = Date.now();

      if (now - lastActivity > INACTIVITY_LIMIT_MS) {
        // Clear interval and event listeners to prevent loop
        clearInterval(interval);
        activityEvents.forEach((event) => {
          window.removeEventListener(event, updateActivity);
        });

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            // Log out from Supabase
            await supabase.auth.signOut();
          } catch (err) {
            console.error('Error during auto-logout signOut:', err);
          }
        }

        // Clear local storage and redirect
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login?message=Session+expired+due+to+1+hour+of+inactivity.';
      }
    }, CHECK_INTERVAL_MS);

    // Clean up listeners on unmount
    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  return null;
}
