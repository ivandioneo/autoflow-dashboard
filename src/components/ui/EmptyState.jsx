import "./ui.css";

/**
 * EmptyState — displayed when a data set has no content yet.
 *
 * Props:
 *   icon    — optional React node (SVG) displayed above the title
 *   title   — required: primary empty state message
 *   message — optional supporting text
 *   action  — optional: { label: string, onClick: fn } primary action
 */
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="af-empty-state" role="status">
      {icon && (
        <span className="af-empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="af-empty-state-title">{title}</p>
      {message && (
        <p className="af-empty-state-message">{message}</p>
      )}
      {action && (
        <button
          className="af-empty-state-action primary"
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
