import React from 'react';

interface LoadingScreenProps {
  /** Message displayed below the loader. */
  message?: string;
  /** Optional sub-message for additional context. */
  subMessage?: string;
  /** When true renders inline rather than full-screen. */
  inline?: boolean;
}

/**
 * Standardised loading screen used across the application.
 * Uses the existing netflix-spinner CSS classes from index.css.
 * Announces itself to screen readers via `role="status"` + `aria-live`.
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  subMessage,
  inline = false
}) => {
  const wrapperClasses = inline
    ? 'flex items-center justify-center py-16'
    : 'min-h-screen bg-[#0A0A1F] text-white flex items-center justify-center';

  return (
    <div className={wrapperClasses} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        {/* Animated loader */}
        <div className="relative">
          <div className="h-16 w-16 netflix-spinner-thick" />
          <div className="h-16 w-16 netflix-ripple" />
          <div className="h-16 w-16 netflix-ripple" style={{ animationDelay: '0.5s' }} />
        </div>
        {/* Text area */}
        <div className="text-center loading-text">
          <p className="text-white text-lg font-medium">{message}</p>
          {subMessage && (
            <p className="text-gray-400 text-sm mt-1">{subMessage}</p>
          )}
          <div className="flex gap-2 justify-center mt-3">
            <div className="netflix-dot" />
            <div className="netflix-dot" />
            <div className="netflix-dot" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
