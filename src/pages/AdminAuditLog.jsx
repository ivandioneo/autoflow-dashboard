import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Admin.css";

function timeAgo(iso) {
  if (!iso) return "";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}

function formatTs(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDetails(details) {
  if (!details) return "";
  if (typeof details === "string") return details;
  const keys = Object.keys(details);
  if (keys.length === 0) return "";
  return keys.map(function (k) { return k + ": " + details[k]; }).join(", ");
}

const ACTION_CATEGORIES = [
  { label: "All events", value: "" },
  { label: "Login / logout", value: "auth.login" },
  { label: "Login failures", value: "auth.login_failed" },
  { label: "Registration", value: "auth.register" },
  { label: "Email verification", value: "auth.email_verified" },
  { label: "Token refresh", value: "auth.token_refreshed" },
  { label: "Password reset", value: "auth.password_reset" },
  { label: "Admin actions", value: "admin." },
];

export default function AdminAuditLog() {
  const navigate = useNavigate();
  const [audit, setAudit] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getAdminAudit(), api.getAdminTenants()])
      .then(function (results) {
        if (cancelled) return;
        setAudit(results[0] || []);
        setTenants(results[1] || []);
      })
      .catch(function (err) {
        if (!cancelled) setError(err.message);
      })
      .finally(function () {
        if (!cancelled) setLoading(false);
      });
    return function () { cancelled = true; };
  }, []);

  // Build tenant id → name map
  const tenantMap = useMemo(function () {
    const m = {};
    tenants.forEach(function (t) { m[t.id] = t.name; });
    return m;
  }, [tenants]);

  // Load more: re-fetch with higher limit
  function handleLoadMore() {
    const next = Math.min(limit + 50, 100);
    setLoadingMore(true);
    api.getAdminAudit()
      .then(function (data) { setAudit(data || []); setLimit(next); })
      .catch(function () {})
      .finally(function () { setLoadingMore(false); });
  }

  // Filtered view
  const filtered = useMemo(function () {
    return audit.filter(function (item) {
      if (actionFilter && item.action.indexOf(actionFilter) === -1) return false;
      if (tenantFilter && String(item.tenant_id) !== tenantFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          item.action,
          item.ip_address,
          formatDetails(item.details),
          tenantMap[item.tenant_id] || "",
        ].join(" ").toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });
  }, [audit, actionFilter, tenantFilter, search, tenantMap]);

  if (loading) {
    return (
      <div className="admin-shell">
        <p className="admin-muted">Loading audit log…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-shell">
        <div className="admin-error">
          <p>{error}</p>
          <button className="admin-btn" onClick={() => navigate("/admin")}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Admin · Security</span>
          <h1 className="admin-title">Audit log</h1>
        </div>
        <nav className="admin-nav">
          <Link to="/admin" className="admin-link">← Overview</Link>
          <Link to="/" className="admin-link">Tenant view</Link>
        </nav>
      </header>

      {/* Filter bar */}
      <div className="audit-filters">
        <input
          className="audit-search"
          type="search"
          placeholder="Search action, tenant, IP, details…"
          value={search}
          onChange={function (e) { setSearch(e.target.value); }}
        />
        <select
          className="audit-select"
          value={actionFilter}
          onChange={function (e) { setActionFilter(e.target.value); }}
        >
          {ACTION_CATEGORIES.map(function (cat) {
            return (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            );
          })}
        </select>
        <select
          className="audit-select"
          value={tenantFilter}
          onChange={function (e) { setTenantFilter(e.target.value); }}
        >
          <option value="">All tenants</option>
          {tenants.map(function (t) {
            return (
              <option key={t.id} value={t.id}>{t.name}</option>
            );
          })}
        </select>
        {(search || actionFilter || tenantFilter) && (
          <button
            className="admin-btn audit-clear"
            onClick={function () { setSearch(""); setActionFilter(""); setTenantFilter(""); }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-title audit-count">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          {(search || actionFilter || tenantFilter) && audit.length !== filtered.length && (
            <span className="admin-muted"> (filtered from {audit.length})</span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty">
            <p>No events match the current filters.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Tenant</th>
                  <th>IP address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(function (item, i) {
                  const failed =
                    item.action.indexOf("failed") !== -1 ||
                    item.action.indexOf("denied") !== -1;
                  const tenantName = item.tenant_id
                    ? tenantMap[item.tenant_id] || item.tenant_id.slice(0, 8) + "…"
                    : "—";
                  const details = formatDetails(item.details);
                  return (
                    <tr key={item.id || i}>
                      <td className="admin-muted" title={new Date(item.created_at).toLocaleString()}>
                        {timeAgo(item.created_at)}
                        <br />
                        <span style={{ fontSize: "0.72rem" }}>{formatTs(item.created_at)}</span>
                      </td>
                      <td>
                        <span className="admin-mono">
                          <span
                            className={failed ? "audit-dot audit-dot-bad" : "audit-dot audit-dot-ok"}
                          />
                          {item.action}
                        </span>
                      </td>
                      <td>
                        {item.tenant_id ? (
                          <Link
                            to={"/admin/tenants/" + encodeURIComponent(item.tenant_id)}
                            className="audit-tenant-link"
                          >
                            {tenantName}
                          </Link>
                        ) : (
                          <span className="admin-muted">—</span>
                        )}
                      </td>
                      <td className="admin-mono admin-muted">
                        {item.ip_address || "—"}
                      </td>
                      <td className="admin-muted audit-details">
                        {details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {audit.length >= 50 && limit < 100 && (
          <div className="audit-load-more">
            <button
              className="admin-btn"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
