import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-danger-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  An unexpected error occurred in the application. You can try to recover by clicking the button below.
                </p>
                <details className="mb-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs font-mono text-danger-700 break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="mt-2 text-xs font-mono text-gray-600 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
                <div className="flex space-x-3">
                  <button
                    onClick={this.resetError}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
