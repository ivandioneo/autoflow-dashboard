import "./TopBar.css";

/**
 * TopBar — application top header bar.
 *
 * Props:
 *   tenant       — authenticated tenant object
 *   title        — current page title (optional; passed by each page)
 *   onMenuToggle — called when mobile hamburger is pressed
 *   onLogout     — logout handler from App.jsx
 */
export default function TopBar({ tenant, title, onMenuToggle, onLogout }) {
  const displayName = tenant && (tenant.name || tenant.email || "");

  return (
    <header className="af-topbar" role="banner">
      {/* Left: mobile hamburger + optional page title */}
      <div className="af-topbar-left">
        <button
          className="af-topbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          type="button"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {title && <h1 className="af-topbar-title">{title}</h1>}
      </div>

      {/* Right: user identity + sign out */}
      <div className="af-topbar-right">
        {displayName && (
          <span
            className="af-topbar-user"
            aria-label={"Signed in as " + displayName}
          >
            {displayName}
          </span>
        )}

        <button
          className="af-topbar-logout-btn"
          onClick={onLogout}
          type="button"
          aria-label="Sign out"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="af-topbar-logout-label">Sign out</span>
        </button>
      </div>
    </header>
  );
}
