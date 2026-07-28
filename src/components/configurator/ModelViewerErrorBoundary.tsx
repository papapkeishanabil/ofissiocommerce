"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  resetKey: string;
  onError?: () => void;
}

interface State {
  failed: boolean;
}

export class ModelViewerErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Model 3D gagal dimuat", error, info);
    this.props.onError?.();
  }

  override componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  override render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <p className="text-sm font-bold text-ink">Model 3D gagal dimuat.</p>
            <p className="mt-1 text-xs text-ink-muted">
              Silakan coba lagi atau hubungi admin.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
