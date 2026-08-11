"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface GlobalError {
  title: string;
  message?: string;
}

interface ErrorContextValue {
  error: GlobalError | null;
  setError: (error: GlobalError | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<GlobalError | null>(null);

  const setError = useCallback((next: GlobalError | null) => {
    setErrorState(next);
  }, []);

  const clearError = useCallback(() => setErrorState(null), []);

  const value = useMemo(
    () => ({ error, setError, clearError }),
    [error, setError, clearError],
  );

  return (
    <ErrorContext.Provider value={value}>
      {error ? (
        <div className="fixed inset-x-0 top-0 z-[90] p-4">
          <Alert variant="danger" title={error.title} className="shadow-lg">
            {error.message}
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </Alert>
        </div>
      ) : null}
      {children}
    </ErrorContext.Provider>
  );
}

export function useGlobalError(): ErrorContextValue {
  const ctx = useContext(ErrorContext);
  if (!ctx) {
    throw new Error("useGlobalError must be used within ErrorProvider");
  }
  return ctx;
}
