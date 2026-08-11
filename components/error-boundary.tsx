"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/ui/error-state";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Client-side error boundary for isolating render failures in a subtree.
 * Complements Next.js route-level `error.tsx` (which catches server/render
 * errors per segment).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  private reset = (): void => this.setState({ hasError: false });

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            title="This section failed to render"
            description="An unexpected error occurred. You can try reloading this section."
            onRetry={this.reset}
          />
        )
      );
    }
    return this.props.children;
  }
}
