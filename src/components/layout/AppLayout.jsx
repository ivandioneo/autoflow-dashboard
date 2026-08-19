import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "./AppLayout.css";

/**
 * AppLayout — shared application shell for new AutoFlow frontend surfaces.
 *
 * Receives the same props pattern used by existing pages:
 *   tenant   — authenticated tenant object from App.jsx
 *   onLogout — logout handler from App.jsx
 *   title    — current page title shown in TopBar
 *   children — page content
 *
 * Legacy pages (Templates, RunHistory, HttpRequest, Config, etc.) do NOT
 * use this component. They remain unchanged with their own chrome.
 * This shell is opt-in; no existing page has been modified to use it.
 */
export default function AppLayout({ tenant, onLogout, title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleMenuToggle() {
    setSidebarOpen(function (prev) { return !prev; });
  }

  function handleSidebarClose() {
    setSidebarOpen(false);
  }

  return (
    <div className="af-shell">
      <Sidebar
        tenant={tenant}
        open={sidebarOpen}
        onClose={handleSidebarClose}
      />

      {sidebarOpen && (
        <div
          className="af-sidebar-backdrop"
          onClick={handleSidebarClose}
          aria-hidden="true"
        />
      )}

      <div className="af-shell-body">
        <TopBar
          tenant={tenant}
          title={title}
          onMenuToggle={handleMenuToggle}
          onLogout={onLogout}
        />
        <main className="af-main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
