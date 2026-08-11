"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, type ModalSize } from "@/components/ui/modal";

interface ModalState {
  open: boolean;
  title?: string;
  description?: string;
  size?: ModalSize;
  content?: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
}

interface ModalContextValue {
  openModal: (options: Omit<ModalState, "open">) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const INITIAL: ModalState = { open: false };

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(INITIAL);

  const closeModal = useCallback(() => setState(INITIAL), []);

  const openModal = useCallback((options: Omit<ModalState, "open">) => {
    setState({ open: true, ...options });
  }, []);

  const value = useMemo(
    () => ({ openModal, closeModal }),
    [openModal, closeModal],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Modal
        open={state.open}
        onClose={closeModal}
        title={state.title}
        description={state.description}
        size={state.size}
        footer={state.footer}
        closeOnOverlay={state.closeOnOverlay}
      >
        {state.content}
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return ctx;
}
