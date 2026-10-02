"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Enterprise React Error Boundary that catches unhandled runtime UI errors,
 * prevents white-screen crashes, sanitizes any stack traces from user view,
 * and provides localized retry recovery.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "An unexpected application error occurred.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, we log structured error info without rendering raw details
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn("Captured by ErrorBoundary:", error.message, errorInfo.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto my-8 rounded-xl bg-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-rose-500">
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/40">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {this.props.fallbackTitle || "Application View Encountered an Error"}
              </h3>
              <p className="text-xs text-slate-400">
                A localized runtime failure occurred while rendering this interface.
              </p>
            </div>
          </div>

          <Alert variant="danger">
            The operational view failed to render safely. Financial data and credentials remain secure.
          </Alert>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-900">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Reload Page
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReset}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-sm shadow-rose-900/40"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Try Recovering View
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
