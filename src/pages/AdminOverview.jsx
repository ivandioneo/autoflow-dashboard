import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Admin.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// The API returns `details` as a JSON object (often empty). Rendering an
// object straight into JSX throws, so flatten it to a readable string.
function formatDetails(details) {
  if (!details) return "";
  if (typeof details === "string") return details;
  const keys = Object.keys(details);
  if (keys.length === 0) return "";
  return keys
    .map(function (k) {
      return k + ": " + details[k];
    })
    .join(", ");
}

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

export default function AdminOverview({ tenant, onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("activity");
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getAdminStats(),
      api.getAdminTenants(),
      api.getAdminActivity(),
      api.getAdminAudit(),
    ])
      .then(function (results) {
        if (cancelled) return;
        setStats(results[0]);
        setTenants(results[1] || []);
        setActivity(results[2] || []);
        setAudit(results[3] || []);
      })
      .catch(function (err) {
        if (!cancelled) setError(err.message);
      })
      .finally(function () {
        if (!cancelled) setLoading(false);
      });

    return function () {
      cancelled = true;
    };
  }, []);

  const unverified = tenants.filter(function (t) {
    return !t.email_verified;
  }).length;

  if (loading) {
    return (
      <div className="admin-shell">
        <p className="admin-muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-shell">
        <div className="admin-error">
          <p>{error}</p>
          <button className="admin-btn" onClick={() => navigate("/")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const feed = tab === "activity" ? activity : audit;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Admin</span>
          <h1 className="admin-title">Platform overview</h1>
        </div>
        <nav className="admin-nav">
          <Link to="/" className="admin-link">
            Tenant view
          </Link>
          <button className="admin-btn admin-btn-quiet" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <section className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-value">{stats.total_tenants}</span>
          <span className="admin-stat-label">Subscribers</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{stats.active_automations}</span>
          <span className="admin-stat-label">Active automations</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-value">{activity.length}</span>
          <span className="admin-stat-label">Logged runs</span>
        </div>
        <div className="admin-stat">
          <span
            className={
              unverified > 0
                ? "admin-stat-value admin-stat-warn"
                : "admin-stat-value"
            }
          >
            {unverified}
          </span>
          <span className="admin-stat-label">Unverified accounts</span>
        </div>
      </section>

      <section className="admin-plans">
        {Object.keys(stats.plans || {}).map(function (plan) {
          return (
            <span key={plan} className="admin-plan-chip">
              {plan} · {stats.plans[plan]}
            </span>
          );
        })}
      </section>

      <section className="admin-panel">
        <h2 className="admin-panel-title">Subscribers</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Automations</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(function (t) {
                return (
                  <tr
                    key={t.id}
                    className="admin-row"
                    onClick={() => navigate("/admin/tenants/" + t.id)}
                  >
                    <td>
                      <span className="admin-name">{t.name}</span>
                      {t.role === "admin" && (
                        <span className="admin-tag">admin</span>
                      )}
                    </td>
                    <td className="admin-muted">{t.email}</td>
                    <td>
                      <span className="admin-plan-chip">{t.plan}</span>
                    </td>
                    <td>{t.active_automations}</td>
                    <td>
                      {t.email_verified ? (
                        <span className="admin-badge admin-badge-ok">
                          Verified
                        </span>
                      ) : (
                        <span className="admin-badge admin-badge-warn">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="admin-muted">{formatDate(t.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-tabs">
          <button
            className={
              tab === "activity" ? "admin-tab admin-tab-on" : "admin-tab"
            }
            onClick={() => setTab("activity")}
          >
            Automation runs
          </button>
          <button
            className={tab === "audit" ? "admin-tab admin-tab-on" : "admin-tab"}
            onClick={() => setTab("audit")}
          >
            Security events
          </button>
        </div>

        {feed.length === 0 ? (
          <div className="admin-empty">
            {tab === "activity" ? (
              <>
                <p>No automation runs recorded yet.</p>
                <p className="admin-muted">
                  Runs appear here once your Activepieces flows post to
                  /engine/log at the end of each execution.
                </p>
              </>
            ) : (
              <p>No security events recorded yet.</p>
            )}
          </div>
        ) : (
          <ul className="admin-feed">
            {feed.map(function (item, i) {
              const label = item.action || item.template_slug || "event";
              const failed =
                label.indexOf("failed") !== -1 ||
                item.status === "error" ||
                item.status === "failed";
              return (
                <li key={item.id || i} className="admin-feed-item">
                  <span
                    className={
                      failed
                        ? "admin-dot admin-dot-bad"
                        : "admin-dot admin-dot-ok"
                    }
                  />
                  <span className="admin-feed-main">
                    <span className="admin-mono">{label}</span>
                    {formatDetails(item.details) && (
                      <span className="admin-muted">
                        {" · " + formatDetails(item.details)}
                      </span>
                    )}
                  </span>
                  {item.ip_address && (
                    <span className="admin-muted admin-mono admin-feed-ip">
                      {item.ip_address}
                    </span>
                  )}
                  <span className="admin-muted admin-feed-time">
                    {timeAgo(item.timestamp || item.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
