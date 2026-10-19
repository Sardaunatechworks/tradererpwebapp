import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id, duration: toast.duration ?? 4000 };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

/**
 * Convenient standalone helper methods
 */
export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'success', message, title, duration }),
  error: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'error', message, title, duration: duration ?? 6000 }),
  info: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'info', message, title, duration }),
  warning: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'warning', message, title, duration }),
};
