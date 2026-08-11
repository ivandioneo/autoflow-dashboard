import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const STATUS_ALL = "";
const STATUS_SUCCESS = "success";
const STATUS_ERROR = "error";

function StatusBadge({ status }) {
  const isSuccess = status === "success";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: isSuccess ? "rgba(67,122,34,0.12)" : "rgba(161,44,123,0.12)",
        color: isSuccess ? "#437a22" : "#a12c7b",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: isSuccess ? "#437a22" : "#a12c7b",
          display: "inline-block",
        }}
      />
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {["40%", "20%", "12%", "28%"].map((w, i) => (
        <td key={i} style={{ padding: "0.875rem 1rem" }}>
          <div
            style={{
              height: "1em",
              width: w,
              borderRadius: "4px",
              background:
                "linear-gradient(90deg,var(--color-surface-offset,#e6e4df) 25%,var(--color-surface-dynamic,#d8d6d2) 50%,var(--color-surface-offset,#e6e4df) 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function DetailExpander({ details }) {
  const [open, setOpen] = useState(false);
  const hasContent = details && Object.keys(details).length > 0;
  if (!hasContent) return <span style={{ color: "var(--color-text-faint,#bab9b4)", fontSize: "0.8rem" }}>—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "var(--color-primary,#01696f)",
          padding: 0,
          fontWeight: 500,
        }}
        aria-expanded={open}
      >
        {open ? "Hide details ▲" : "Show details ▼"}
      </button>
      {open && (
        <pre
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            borderRadius: "6px",
            background: "var(--color-surface-offset,#e6e4df)",
            fontSize: "0.72rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: "200px",
            overflow: "auto",
            color: "var(--color-text,#28251d)",
          }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function RunHistory({ tenant, onLogout }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(
    async (newOffset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: limit + 1, offset: newOffset };
        if (statusFilter) params.status = statusFilter;
        const data = await api.getLogs(tenant.id, params);
        const rows = data || [];
        setHasMore(rows.length > limit);
        setLogs(rows.slice(0, limit));
        setOffset(newOffset);
      } catch (e) {
        setError(e.message || "Failed to load logs");
      } finally {
        setLoading(false);
      }
    },
    [tenant.id, statusFilter, limit]
  );

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg,#f7f6f2)", color: "var(--color-text,#28251d)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .logs-table tr:hover td { background: var(--color-surface-offset,#f3f0ec); }
        .logs-table td, .logs-table th { border-bottom: 1px solid var(--color-divider,#dcd9d5); }
      `}</style>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--color-surface,#f9f8f5)",
        borderBottom: "1px solid var(--color-divider,#dcd9d5)",
        padding: "0 1.5rem",
        display: "flex", alignItems: "center", gap: "1rem", height: "56px",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary,#01696f)", fontSize: "0.875rem", fontWeight: 500, padding: 0 }}
        >
          ← Automations
        </button>
        <span style={{ color: "var(--color-divider,#dcd9d5)" }}>|</span>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Run History</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted,#7a7974)" }}>{tenant.email}</span>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{ fontSize: "0.8rem", color: "var(--color-text-muted,#7a7974)", background: "none", border: "none", cursor: "pointer" }}
            >
              Log out
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Page title + filter bar */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0 }}>Automation Run History</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label htmlFor="status-filter" style={{ fontSize: "0.8rem", color: "var(--color-text-muted,#7a7974)" }}>Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: "0.85rem", padding: "0.3rem 0.75rem", borderRadius: "6px",
                border: "1px solid var(--color-border,#d4d1ca)",
                background: "var(--color-surface,#f9f8f5)",
                color: "var(--color-text,#28251d)", cursor: "pointer",
              }}
            >
              <option value={STATUS_ALL}>All</option>
              <option value={STATUS_SUCCESS}>Success</option>
              <option value={STATUS_ERROR}>Error</option>
            </select>

            <label htmlFor="limit-select" style={{ fontSize: "0.8rem", color: "var(--color-text-muted,#7a7974)", marginLeft: "0.5rem" }}>Show</label>
            <select
              id="limit-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                fontSize: "0.85rem", padding: "0.3rem 0.5rem", borderRadius: "6px",
                border: "1px solid var(--color-border,#d4d1ca)",
                background: "var(--color-surface,#f9f8f5)",
                color: "var(--color-text,#28251d)", cursor: "pointer",
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <button
              onClick={() => fetchLogs(offset)}
              title="Refresh"
              style={{
                marginLeft: "0.25rem", background: "none", border: "1px solid var(--color-border,#d4d1ca)",
                borderRadius: "6px", padding: "0.3rem 0.6rem", cursor: "pointer",
                color: "var(--color-text-muted,#7a7974)", fontSize: "0.85rem",
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            padding: "1rem", borderRadius: "8px",
            background: "rgba(161,44,123,0.08)", color: "#a12c7b",
            marginBottom: "1rem", fontSize: "0.875rem",
          }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{
          background: "var(--color-surface,#f9f8f5)",
          borderRadius: "10px",
          border: "1px solid var(--color-border,#d4d1ca)",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(40,37,29,0.06)",
        }}>
          <table className="logs-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-offset,#f3f0ec)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted,#7a7974)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Timestamp</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted,#7a7974)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Template</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted,#7a7974)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted,#7a7974)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : logs.length === 0
                ? (
                  <tr>
                    <td colSpan={4}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3.5rem 1rem", color: "var(--color-text-muted,#7a7974)" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "1rem", color: "var(--color-text-faint,#bab9b4)" }}>
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                          <rect x="9" y="3" width="6" height="4" rx="1" />
                          <path d="M9 12h6M9 16h4" />
                        </svg>
                        <p style={{ fontWeight: 600, color: "var(--color-text,#28251d)", margin: "0 0 0.25rem" }}>No runs yet</p>
                        <p style={{ fontSize: "0.85rem", margin: 0 }}>Automation runs will appear here once you trigger them via the API.</p>
                      </div>
                    </td>
                  </tr>
                )
                : logs.map((log) => (
                  <tr key={log.id} style={{ transition: "background 120ms" }}>
                    <td style={{ padding: "0.875rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap", color: "var(--color-text-muted,#7a7974)", fontVariantNumeric: "tabular-nums" }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <code style={{ fontSize: "0.82rem", background: "var(--color-surface-offset,#f3f0ec)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>
                        {log.template_slug}
                      </code>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <StatusBadge status={log.status} />
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <DetailExpander details={log.details} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontSize: "0.85rem", color: "var(--color-text-muted,#7a7974)" }}>
            <span>Showing {offset + 1}–{offset + logs.length}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                disabled={offset === 0}
                onClick={() => fetchLogs(Math.max(0, offset - limit))}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "6px",
                  border: "1px solid var(--color-border,#d4d1ca)",
                  background: offset === 0 ? "var(--color-surface-offset,#f3f0ec)" : "var(--color-surface,#f9f8f5)",
                  color: offset === 0 ? "var(--color-text-faint,#bab9b4)" : "var(--color-text,#28251d)",
                  cursor: offset === 0 ? "not-allowed" : "pointer",
                }}
              >
                ← Previous
              </button>
              <button
                disabled={!hasMore}
                onClick={() => fetchLogs(offset + limit)}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "6px",
                  border: "1px solid var(--color-border,#d4d1ca)",
                  background: !hasMore ? "var(--color-surface-offset,#f3f0ec)" : "var(--color-surface,#f9f8f5)",
                  color: !hasMore ? "var(--color-text-faint,#bab9b4)" : "var(--color-text,#28251d)",
                  cursor: !hasMore ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
