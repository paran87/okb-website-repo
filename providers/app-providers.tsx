"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { ModalProvider } from "@/providers/modal-provider";
import { DrawerProvider } from "@/providers/drawer-provider";
import { DialogProvider } from "@/providers/dialog-provider";
import { LoadingProvider } from "@/providers/loading-provider";
import { ErrorProvider } from "@/providers/error-provider";
import { ToastViewport } from "@/components/ui/toast";

/**
 * Composes all client-side providers behind a single boundary so the root
 * layout stays a Server Component.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <ErrorProvider>
        <LoadingProvider>
          <AuthProvider>
            <SessionProvider>
              <SocketProvider>
                <QueryProvider>
                  <ModalProvider>
                    <DrawerProvider>
                      <DialogProvider>
                        {children}
                        <ToastViewport />
                      </DialogProvider>
                    </DrawerProvider>
                  </ModalProvider>
                </QueryProvider>
              </SocketProvider>
            </SessionProvider>
          </AuthProvider>
        </LoadingProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
}
