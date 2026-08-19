import "./ui.css";

/**
 * LoadingSpinner — inline spinner for loading states.
 *
 * Props:
 *   size  — "sm" | "md" (default) | "lg"
 *   label — accessible label string (default: "Loading")
 */
export default function LoadingSpinner({ size = "md", label = "Loading" }) {
  return (
    <span
      className={"af-spinner af-spinner--" + size}
      role="status"
      aria-label={label}
    >
      <span className="af-spinner-ring" aria-hidden="true" />
    </span>
  );
}
