"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

export type SocketStatus = "connected" | "connecting" | "disconnected";

interface SocketContextValue {
  status: SocketStatus;
  /** Placeholder — real socket client lands in the realtime phase. */
  emit: (event: string, payload?: unknown) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

/** Placeholder realtime socket provider for future WebSocket integration. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SocketContextValue>(
    () => ({
      status: "disconnected",
      emit: () => {
        /* no-op until socket client is configured */
      },
    }),
    [],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
}
