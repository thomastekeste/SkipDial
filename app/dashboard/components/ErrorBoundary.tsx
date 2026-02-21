"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Something went wrong</h2>
          <p className="mb-6 text-sm text-zinc-400 dark:text-zinc-500">An unexpected error occurred.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#22C55E]/25 transition-all hover:bg-[#16A34A] active:scale-[0.98]"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
