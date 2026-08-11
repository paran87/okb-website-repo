"use client";

import { useCallback, useMemo } from "react";
import {
  useToastStore,
  type ToastInput,
  type ToastVariant,
} from "@/lib/store/toast.store";

type ShorthandArgs = string | Omit<ToastInput, "variant">;

function normalize(
  args: ShorthandArgs,
  variant: ToastVariant,
): ToastInput {
  return typeof args === "string"
    ? { title: args, variant }
    : { ...args, variant };
}

/**
 * Ergonomic toast API:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error({ title: "Failed", description: "Try again" });
 */
export function useToast() {
  const add = useToastStore((state) => state.add);
  const dismiss = useToastStore((state) => state.dismiss);

  const success = useCallback(
    (args: ShorthandArgs) => add(normalize(args, "success")),
    [add],
  );
  const error = useCallback(
    (args: ShorthandArgs) => add(normalize(args, "error")),
    [add],
  );
  const warning = useCallback(
    (args: ShorthandArgs) => add(normalize(args, "warning")),
    [add],
  );
  const info = useCallback(
    (args: ShorthandArgs) => add(normalize(args, "info")),
    [add],
  );

  return useMemo(
    () => ({ success, error, warning, info, dismiss, custom: add }),
    [success, error, warning, info, dismiss, add],
  );
}
