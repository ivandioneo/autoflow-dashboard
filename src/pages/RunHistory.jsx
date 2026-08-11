import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./RunHistory.css";

const STATUS_LABELS = { success: "Success", error: "Error" };

function StatusBadge({ status }) {
  return (
    <span className={`run-badge run-badge--${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="log-row"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <td className="log-cell log-cell--ts">{formatDate(log.created_at)}</td>
        <td className="log-cell log-cell--slug">{log.template_slug}</td>
        <td className="log-cell log-cell--status">
          <StatusBadge status={log.status} />
        </td>
        <td className="log-cell log-cell--expand">
          <span className={`expand-icon ${open ? "open" : ""}`}>&#9654;</span>
        </td>
      </tr>
      {open && (
        <tr className="log-detail-row">
          <td colSpan={4}>
            <pre className="log-detail-json">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="log-row">
      {["60%", "40%", "20%", "10%"].map((w, j) => (
        <td key={j} className="log-cell">
          <span className="skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  ));
}

export default function RunHistory({ tenant }) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    load();
  }, [statusFilter, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = { limit };
      if (statusFilter) params.status = statusFilter;
      const data = await api.getLogs(tenant.id, params);
      setLogs(data || []);
    } catch (err) {
      setError(err.message || "Failed to load run history.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Run History</h1>
          <p className="subtitle">{tenant.name}</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => navigate("/")}>
            &#8592; Automations
          </button>
        </div>
      </div>

      <div className="run-filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>

        <label htmlFor="limit-select">Show</label>
        <select
          id="limit-select"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>

      {error && <p className="run-error">{error}</p>}

      <div className="run-table-wrapper">
        <table className="run-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Template</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <span className="empty-icon">&#9654;</span>
                    <p>No runs yet</p>
                    <span className="empty-hint">
                      Trigger an automation via the API and runs will appear here.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
