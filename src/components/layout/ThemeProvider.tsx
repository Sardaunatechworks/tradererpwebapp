'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

export default function ThemeProvider() {
  const { theme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Avoid hydrations mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme, mounted]);

  return null;
}
