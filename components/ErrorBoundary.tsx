import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { handleError } from '@/services/utils/errorHandler';

/**
 * Props for the ErrorBoundary component.
 * @property {ReactNode} children - The child components to render.
 */
interface Props {
  children: ReactNode;
}

/**
 * State for the ErrorBoundary component.
 * @property {boolean} hasError - True if an error has been caught.
 */
interface State {
  hasError: boolean;
}

/**
 * A React component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  /**
   * Updates state so the next render will show the fallback UI.
   * @param {Error} _ - The error that was thrown.
   * @returns {State} The updated state.
   */
  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  /**
   * Catches errors after they have been thrown and logs them.
   * @param {Error} error - The error that was thrown.
   * @param {ErrorInfo} errorInfo - An object with a componentStack key.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    handleError(error, { componentStack: errorInfo.componentStack });
  }

  /**
   * Handles the reload button click to refresh the application.
   */
  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-base text-text-base p-4 sm:p-6 lg:p-8 flex items-center justify-center">
            <Card className="max-w-lg w-full text-center border-danger/50">
                <AlertTriangle className="mx-auto h-16 w-16 text-danger mb-4" />
                <h1 className="text-2xl font-bold text-danger font-orbitron mb-2">
                    Something went wrong
                </h1>
                <p className="text-text-base mb-6">
                    An unexpected error occurred in the application. Please try reloading the page.
                </p>
                <Button onClick={this.handleReload} variant="danger">
                    <RotateCw size={18} />
                    Reload Page
                </Button>
            </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;