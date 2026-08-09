import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Admin.css";
import "./AdminAuditLog.css";

const PAGE_SIZE = 50;

const ACTION_GROUPS = [
  { label: "All events", value: "" },
  { label: "Auth", value: "auth" },
  { label: "Admin", value: "admin" },
  { label: "Config", value: "config" },
  { label: "Registration", value: "registration" },
  { label: "Password", value: "password" },
  { label: "Email", value: "email" },
];

function formatTs(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDetails(details) {
  if (!details) return "";
  if (typeof details === "string") return details;
  const keys = Object.keys(details);
  if (keys.length === 0) return "";
  return keys.map((k) => k + ": " + details[k]).join(" · ");
}

function isFailed(action) {
  return action && (action.indexOf("fail") !== -1 || action.indexOf("invalid") !== -1 || action.indexOf("denied") !== -1);
}

export default function AdminAuditLog({ tenant, onLogout }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async function (off, action) {
      setLoading(true);
      setError("");
      try {
        const data = await api.getAdminAuditPaged({ limit: PAGE_SIZE, offset: off, action });
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message || "Failed to load audit log");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(offset, actionFilter);
  }, [load, offset, actionFilter]);

  function handleActionChange(val) {
    setActionFilter(val);
    setOffset(0);
  }

  function handlePrev() {
    setOffset((o) => Math.max(0, o - PAGE_SIZE));
  }

  function handleNext() {
    setOffset((o) => o + PAGE_SIZE);
  }

  const searchLower = search.toLowerCase();
  const filtered = search
    ? items.filter(
        (item) =>
          (item.action || "").toLowerCase().includes(searchLower) ||
          (item.tenant_name || "").toLowerCase().includes(searchLower) ||
          (item.ip_address || "").includes(search)
      )
    : items;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Admin</span>
          <h1 className="admin-title">Audit log</h1>
        </div>
        <nav className="admin-nav">
          <Link to="/admin" className="admin-link">
            ← Overview
          </Link>
          <Link to="/" className="admin-link">
            Tenant view
          </Link>
          <button className="admin-btn admin-btn-quiet" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <div className="audit-toolbar">
        <div className="audit-filters">
          {ACTION_GROUPS.map((g) => (
            <button
              key={g.value}
              className={"audit-filter-btn" + (actionFilter === g.value ? " audit-filter-btn-on" : "")}
              onClick={() => handleActionChange(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <input
          className="audit-search"
          type="search"
          placeholder="Search action, tenant, IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search audit log"
        />
      </div>

      {error && <div className="admin-error-inline">{error}</div>}

      <section className="admin-panel">
        <div className="audit-panel-header">
          <span className="admin-panel-title" style={{ margin: 0 }}>
            {loading ? "Loading…" : total.toLocaleString() + " events" + (actionFilter ? " · " + actionFilter + ".*" : "")}
          </span>
          {!loading && totalPages > 1 && (
            <span className="audit-page-info admin-muted">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {loading ? (
          <div className="admin-empty"><p>Loading events…</p></div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <p>No events found.</p>
            {search && <p className="admin-muted">Try clearing the search filter.</p>}
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 24 }} />
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Tenant</th>
                  <th>IP</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(function (item) {
                  const failed = isFailed(item.action);
                  const details = formatDetails(item.details);
                  return (
                    <tr key={item.id} className="audit-row">
                      <td>
                        <span
                          className={failed ? "admin-dot admin-dot-bad" : "admin-dot admin-dot-ok"}
                          title={failed ? "Failed / denied" : "Success"}
                        />
                      </td>
                      <td className="admin-muted audit-ts">{formatTs(item.created_at)}</td>
                      <td>
                        <span className="admin-mono audit-action">{item.action || "—"}</span>
                      </td>
                      <td>
                        {item.tenant_name ? (
                          <span className="audit-tenant">{item.tenant_name}</span>
                        ) : (
                          <span className="admin-muted">—</span>
                        )}
                      </td>
                      <td className="admin-mono admin-muted audit-ip">{item.ip_address || "—"}</td>
                      <td className="admin-muted audit-details">{details || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="audit-pagination">
            <button
              className="admin-btn"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              ← Prev
            </button>
            <span className="admin-muted audit-page-info">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <button
              className="admin-btn"
              onClick={handleNext}
              disabled={!hasNext}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
