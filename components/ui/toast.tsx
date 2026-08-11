"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import {
  useToastStore,
  type Toast,
  type ToastVariant,
} from "@/lib/store/toast.store";
import { cn } from "@/utils/cn";

const VARIANT_META: Record<
  ToastVariant,
  { icon: typeof Info; accent: string }
> = {
  success: { icon: CircleCheck, accent: "text-success" },
  error: { icon: CircleX, accent: "text-danger" },
  warning: { icon: TriangleAlert, accent: "text-warning" },
  info: { icon: Info, accent: "text-info" },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const meta = VARIANT_META[toast.variant];
  const IconComponent = meta.icon;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      role="status"
      className="pointer-events-auto flex w-80 items-start gap-3 rounded-card border border-border bg-card p-3.5 shadow-lg"
    >
      <IconComponent className={cn("mt-0.5 size-5 shrink-0", meta.accent)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-caption text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}

/** Global toast viewport. Mounted once near the app root. */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <Portal>
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </Portal>
  );
}
