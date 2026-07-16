import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  /** The main error title/message. */
  title?: string;
  /** Additional error details or troubleshooting steps. */
  message?: string;
  /** If provided, renders a retry button. */
  onRetry?: () => void;
  /** Label for the retry button. Defaults to 'Retry'. */
  retryLabel?: string;
  /** When true renders inline rather than full-screen. */
  inline?: boolean;
}

/**
 * Standardised error screen used across the application.
 * Announces itself to screen readers via `role="alert"` + `aria-live="assertive"`.
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message = 'We encountered an issue loading this content. Please check your connection and try again.',
  onRetry,
  retryLabel = 'Retry',
  inline = false,
}) => {
  const wrapperClasses = inline
    ? 'flex flex-col items-center justify-center py-16 px-4 text-center bg-background-secondary/40 rounded-xl border border-buttons-purple/10'
    : 'min-h-screen bg-background-main text-white flex items-center justify-center p-6 text-center';

  return (
    <div className={wrapperClasses} role="alert" aria-live="assertive">
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* Glow indicator */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-buttons-purple/20 flex items-center justify-center text-red-500 shadow-lg shadow-buttons-purple/5 animate-pulse">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Action Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-buttons-purple hover:bg-buttons-purpleHover active:bg-red-800 text-white font-semibold text-sm rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none shadow-md shadow-red-600/15"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{retryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
