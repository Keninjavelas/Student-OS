import React from 'react';

// Inline SVG icons to avoid lucide-react dependency
function AlertCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/**
 * Global Error Boundary Component
 * Catches React component errors and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Send to error tracking service (e.g., Sentry, LogRocket)
    if (window.__errorTracking) {
      window.__errorTracking.captureException(error, {
        contexts: { react: errorInfo },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <AlertCircleIcon />
            </div>

            <h1 className="mt-4 text-2xl font-bold text-center text-gray-900">
              Oops! Something went wrong
            </h1>

            <p className="mt-2 text-center text-gray-600">
              We're sorry for the inconvenience. An unexpected error occurred.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-3 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-semibold">Error Details</summary>
                <pre className="mt-2 text-xs overflow-auto text-red-600">
                  {this.state.error?.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs overflow-auto text-gray-700">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshIcon />
                Try Again
              </button>
              <a
                href="/"
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-center"
              >
                Go Home
              </a>
            </div>

            {this.state.errorCount > 3 && (
              <p className="mt-4 text-xs text-center text-amber-600 bg-amber-50 p-2 rounded">
                Multiple errors detected. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
