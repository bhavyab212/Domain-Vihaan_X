import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Last-resort boundary: shows a safe message only, never the error text or stack. */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged to the developer console only; never rendered into the page.
    console.error('[ErrorBoundary]', error.name, info.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-ink-950 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-sev-high" aria-hidden />
          <h1 className="text-lg font-semibold text-fg">Something went wrong in the interface</h1>
          <p className="max-w-md text-sm text-fg-muted">
            The UI hit an unexpected error. Your data and the backend are unaffected. Reload to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-line-strong bg-ink-800 px-3.5 py-2 text-sm font-medium text-fg hover:bg-ink-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reload interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
