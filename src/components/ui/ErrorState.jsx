import "./ui.css";

/**
 * ErrorState — displayed when a data fetch or action fails.
 *
 * Props:
 *   title   — error heading (default: "Something went wrong")
 *   message — optional user-safe error detail
 *   onRetry — optional retry handler; renders Retry button when provided
 */
export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}) {
  return (
    <div className="af-error-state" role="alert">
      <span className="af-error-state-icon" aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>
      <p className="af-error-state-title">{title}</p>
      {message && (
        <p className="af-error-state-message">{message}</p>
      )}
      {onRetry && (
        <button
          className="af-error-state-retry secondary"
          onClick={onRetry}
          type="button"
        >
          Try again
        </button>
      )}
    </div>
  );
}
