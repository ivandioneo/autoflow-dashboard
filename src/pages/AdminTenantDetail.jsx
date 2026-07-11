import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import "./Admin.css";

const PLANS = ["free", "starter", "pro"];

// `details` arrives as a JSON object; rendering one directly into JSX throws.
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

export default function AdminTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getAdminTenant(id)
      .then(function (res) {
        if (!cancelled) setData(res);
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
  }, [id]);

  function changePlan(plan) {
    setSaving(true);
    setNotice("");
    api
      .updateTenantPlan(id, plan)
      .then(function () {
        setData(function (prev) {
          return { ...prev, plan: plan };
        });
        setNotice("Plan changed to " + plan + ".");
      })
      .catch(function (err) {
        setError(err.message);
      })
      .finally(function () {
        setSaving(false);
      });
  }

  if (loading) {
    return (
      <div className="admin-shell">
        <p className="admin-muted">Loading…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="admin-shell">
        <div className="admin-error">
          <p>{error}</p>
          <button className="admin-btn" onClick={() => navigate("/admin")}>
            Back to overview
          </button>
        </div>
      </div>
    );
  }

  const configs = data.configs || [];
  const activity = data.activity || [];

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <Link to="/admin" className="admin-eyebrow admin-link">
            ← Admin
          </Link>
          <h1 className="admin-title">{data.name}</h1>
          <p className="admin-muted">{data.email}</p>
        </div>
      </header>

      {notice && <div className="admin-notice">{notice}</div>}
      {error && <div className="admin-error-inline">{error}</div>}

      <section className="admin-panel">
        <h2 className="admin-panel-title">Account</h2>
        <dl className="admin-defs">
          <div>
            <dt>Tenant ID</dt>
            <dd className="admin-mono">{data.id}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{data.role}</dd>
          </div>
          <div>
            <dt>Email status</dt>
            <dd>
              {data.email_verified ? (
                <span className="admin-badge admin-badge-ok">Verified</span>
              ) : (
                <span className="admin-badge admin-badge-warn">Unverified</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{new Date(data.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel">
        <h2 className="admin-panel-title">Plan</h2>
        <div className="admin-plan-picker">
          {PLANS.map(function (plan) {
            const active = data.plan === plan;
            return (
              <button
                key={plan}
                disabled={saving || active}
                className={
                  active
                    ? "admin-plan-btn admin-plan-btn-on"
                    : "admin-plan-btn"
                }
                onClick={() => changePlan(plan)}
              >
                {plan}
              </button>
            );
          })}
        </div>
        <p className="admin-muted admin-hint">
          Changing a plan takes effect immediately and is written to the audit
          log.
        </p>
      </section>

      <section className="admin-panel">
        <h2 className="admin-panel-title">Automations</h2>
        {configs.length === 0 ? (
          <div className="admin-empty">
            <p>This tenant hasn't set up any automations.</p>
          </div>
        ) : (
          <ul className="admin-list">
            {configs.map(function (c) {
              return (
                <li key={c.id} className="admin-list-item">
                  <span>{c.template_slug || c.template_name}</span>
                  <span
                    className={
                      c.enabled
                        ? "admin-badge admin-badge-ok"
                        : "admin-badge admin-badge-off"
                    }
                  >
                    {c.enabled ? "Active" : "Inactive"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-panel">
        <h2 className="admin-panel-title">Activity</h2>
        {activity.length === 0 ? (
          <div className="admin-empty">
            <p>No runs recorded for this tenant.</p>
          </div>
        ) : (
          <ul className="admin-feed">
            {activity.map(function (item, i) {
              return (
                <li key={item.id || i} className="admin-feed-item">
                  <span
                    className={
                      item.status === "success"
                        ? "admin-dot admin-dot-ok"
                        : "admin-dot admin-dot-bad"
                    }
                  />
                  <span className="admin-feed-main">
                    <span className="admin-mono">{item.template_slug}</span>
                    {formatDetails(item.details) && (
                      <span className="admin-muted">
                        {" · " + formatDetails(item.details)}
                      </span>
                    )}
                  </span>
                  <span className="admin-muted admin-feed-time">
                    {new Date(item.timestamp).toLocaleString()}
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
