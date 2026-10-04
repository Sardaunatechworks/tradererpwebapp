import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  quickActionOpen: boolean;
  mobileMoreOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setQuickActionOpen: (open: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  quickActionOpen: false,
  mobileMoreOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setQuickActionOpen: (open) => set({ quickActionOpen: open }),
  setMobileMoreOpen: (open) => set({ mobileMoreOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
