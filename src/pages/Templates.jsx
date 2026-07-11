import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Templates.css";

const TEMPLATE_ICONS = {
  "appointment-reminder": "\u{1F4C5}",
  "quote-follow-up": "\u{2709}\u{FE0F}",
};

export default function Templates({ tenant, onLogout }) {
  const [templates, setTemplates] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tpls, cfgs] = await Promise.all([
        api.getTemplates(),
        api.getConfigs(tenant.id),
      ]);
      setTemplates(tpls);
      setConfigs(cfgs);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  function getConfigForTemplate(templateId) {
    return configs.find((c) => c.template_id === templateId);
  }

  function canAccess(template) {
    const hierarchy = { free: 0, basic: 1, pro: 2 };
    return (hierarchy[tenant.plan] || 0) >= (hierarchy[template.plan_required] || 0);
  }

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Automations</h1>
          <p className="subtitle">{tenant.name}</p>
        </div>
        <div className="header-actions">
          {tenant.role === "admin" && (
            <button className="secondary" onClick={() => navigate("/admin")}>
              Admin
            </button>
          )}
          <button className="secondary" onClick={() => navigate("/settings")}>
            Settings
          </button>
          <button className="ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="templates-grid">
        {templates.map((tpl) => {
          const config = getConfigForTemplate(tpl.id);
          const accessible = canAccess(tpl);

          return (
            <div
              key={tpl.id}
              className={`template-card ${config?.enabled ? "active" : ""} ${!accessible ? "locked" : ""}`}
              onClick={() => accessible && navigate(`/config/${tpl.slug}`)}
            >
              <div className="card-top">
                <span className="card-icon">
                  {TEMPLATE_ICONS[tpl.slug] || "\u{26A1}"}
                </span>
                {!accessible ? (
                  <span className="badge pro">Pro</span>
                ) : config?.enabled ? (
                  <span className="badge active">Active</span>
                ) : (
                  <span className="badge inactive">Inactive</span>
                )}
              </div>
              <h3>{tpl.name}</h3>
              <p>{tpl.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
