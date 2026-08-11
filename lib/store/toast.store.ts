import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export type ToastInput = Omit<Toast, "id" | "variant" | "duration"> & {
  variant?: ToastVariant;
  duration?: number;
};

interface ToastState {
  toasts: Toast[];
  add: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * Headless toast store. UI is rendered by `ToastViewport`; imperative helpers in
 * `hooks/use-toast.ts` provide the ergonomic `toast.success(...)` API.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next: Toast = {
      id,
      title: toast.title,
      description: toast.description,
      variant: toast.variant ?? "info",
      duration: toast.duration ?? 4500,
    };
    set((state) => ({ toasts: [...state.toasts, next] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
