"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Drawer } from "@/components/ui/drawer";

interface DrawerState {
  open: boolean;
  title?: string;
  content?: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
}

interface DrawerContextValue {
  openDrawer: (options: Omit<DrawerState, "open">) => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

const INITIAL: DrawerState = { open: false, side: "right" };

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>(INITIAL);

  const closeDrawer = useCallback(() => setState(INITIAL), []);

  const openDrawer = useCallback((options: Omit<DrawerState, "open">) => {
    setState({ open: true, side: "right", ...options });
  }, []);

  const value = useMemo(
    () => ({ openDrawer, closeDrawer }),
    [openDrawer, closeDrawer],
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <Drawer
        open={state.open}
        onClose={closeDrawer}
        title={state.title}
        footer={state.footer}
        side={state.side}
      >
        {state.content}
      </Drawer>
    </DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useDrawer must be used within DrawerProvider");
  }
  return ctx;
}
