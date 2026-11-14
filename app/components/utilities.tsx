/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the error boundary and the status boundary that together give every view one loading and one failure state.
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";

type BoundaryProps = {
  fallback: (error: Error, reset: () => void) => ReactNode;
  onError: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
};
type BoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error, info);
  }

  render(): ReactNode {
    const { error } = this.state;
    return error
      ? this.props.fallback(error, () => this.setState({ error: null }))
      : this.props.children;
  }
}

export const StatusBoundary = ({
  loading,
  fallback,
  onError,
  children
}: {
  loading: ReactNode;
  fallback: BoundaryProps["fallback"];
  onError: BoundaryProps["onError"];
  children: ReactNode;
}) => (
  <ErrorBoundary fallback={fallback} onError={onError}>
    <Suspense fallback={loading}>{children}</Suspense>
  </ErrorBoundary>
);
