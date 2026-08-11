"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

interface LoadingContextValue {
  isLoading: boolean;
  message?: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const showLoading = useCallback((nextMessage?: string) => {
    setMessage(nextMessage);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setMessage(undefined);
  }, []);

  const value = useMemo(
    () => ({ isLoading, message, showLoading, hideLoading }),
    [isLoading, message, showLoading, hideLoading],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm",
          )}
        >
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card px-6 py-5 shadow-xl">
            <Spinner size="lg" />
            <p className="text-body text-foreground">
              {message ?? "Loading…"}
            </p>
          </div>
        </div>
      ) : null}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return ctx;
}
