import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  currentBranchId: string;
  theme: 'dark' | 'light';
  lastAttendedInventory: number;
  lastAttendedSupport: number;
  lastAttendedNotifications: number;
  setSidebarOpen: (open: boolean) => void;
  setCurrentBranchId: (id: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLastAttendedInventory: (time: number) => void;
  setLastAttendedSupport: (time: number) => void;
  setLastAttendedNotifications: (time: number) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      currentBranchId: 'all',
      theme: 'dark',
      lastAttendedInventory: 0,
      lastAttendedSupport: 0,
      lastAttendedNotifications: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCurrentBranchId: (id) => set({ currentBranchId: id }),
      setTheme: (theme) => set({ theme }),
      setLastAttendedInventory: (time) => set({ lastAttendedInventory: time }),
      setLastAttendedSupport: (time) => set({ lastAttendedSupport: time }),
      setLastAttendedNotifications: (time) => set({ lastAttendedNotifications: time }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'tradererp-ui-storage',
    }
  )
);
