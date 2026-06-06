import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  currentBranchId: string;
  theme: 'dark' | 'light';
  setSidebarOpen: (open: boolean) => void;
  setCurrentBranchId: (id: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      currentBranchId: 'all',
      theme: 'dark',
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCurrentBranchId: (id) => set({ currentBranchId: id }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'tradererp-ui-storage',
    }
  )
);
