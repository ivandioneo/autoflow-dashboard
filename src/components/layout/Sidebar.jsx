import { NavLink } from "react-router-dom";
import "./Sidebar.css";

/**
 * Sidebar — left navigation for new AutoFlow frontend surfaces.
 *
 * Navigation items are limited to currently justified and implemented
 * destinations only. No placeholder, coming-soon, or legacy
 * Activepieces-era items are rendered.
 *
 * Props:
 *   tenant  — authenticated tenant object
 *   open    — boolean; controls mobile overlay open state
 *   onClose — called when a nav item is tapped on mobile
 */
export default function Sidebar({ tenant, open, onClose }) {
  const businessName = tenant && (tenant.name || tenant.email || "My Business");

  return (
    <nav
      className={"af-sidebar" + (open ? " af-sidebar--open" : "")}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="af-sidebar-brand">
        <span className="af-sidebar-brand-mark" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="28" height="28" rx="7" fill="#0D9488" />
            <path
              d="M8 20 L14 8 L20 20"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M10.5 16 L17.5 16"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="af-sidebar-brand-name">AutoFlow</span>
      </div>

      {/* Navigation — only currently implemented destinations */}
      <div className="af-sidebar-nav">
        <NavLink
          to="/settings"
          className={function ({ isActive }) {
            return "af-nav-item" + (isActive ? " af-nav-item--active" : "");
          }}
          onClick={onClose}
        >
          <span className="af-nav-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          <span className="af-nav-label">Settings</span>
        </NavLink>
      </div>

      {/* Account footer */}
      <div className="af-sidebar-footer">
        <div
          className="af-sidebar-account"
          aria-label={"Business account: " + businessName}
        >
          <span className="af-sidebar-account-avatar" aria-hidden="true">
            {businessName.charAt(0).toUpperCase()}
          </span>
          <span className="af-sidebar-account-name">{businessName}</span>
        </div>
      </div>
    </nav>
  );
}
