"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { ButtonVariant } from "@/components/ui/button";

interface DialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
}

interface DialogContextValue {
  confirm: (options: DialogOptions) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const closeDialog = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setOptions(null);
  }, [loading]);

  const confirm = useCallback((next: DialogOptions) => {
    setOptions(next);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!options) return;
    setLoading(true);
    try {
      await options.onConfirm();
      setOpen(false);
      setOptions(null);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const value = useMemo(
    () => ({ confirm, closeDialog }),
    [confirm, closeDialog],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={open}
        title={options?.title ?? ""}
        description={options?.description}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        confirmVariant={options?.confirmVariant}
        isLoading={loading}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return ctx;
}
