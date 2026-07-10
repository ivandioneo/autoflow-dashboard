import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Config.css";

const TEMPLATE_FIELDS = {
  "appointment-reminder": {
    sections: [
      {
        title: "Business details",
        fields: [
          { key: "business_name", label: "Business name", type: "text" },
          { key: "from_email", label: "From email", type: "text" },
        ],
      },
      {
        title: "Reminder timing",
        fields: [
          {
            key: "reminder_24h",
            label: "24-hour reminder",
            description: "Send email 24 hours before",
            type: "toggle",
          },
          {
            key: "reminder_2h",
            label: "2-hour reminder",
            description: "Send email 2 hours before",
            type: "toggle",
          },
          {
            key: "whatsapp_enabled",
            label: "WhatsApp reminder",
            description: "Requires WhatsApp Business API",
            type: "toggle",
            disabled: true,
          },
        ],
      },
    ],
  },
  "quote-follow-up": {
    sections: [
      {
        title: "Business details",
        fields: [
          { key: "business_name", label: "Business name", type: "text" },
          { key: "from_email", label: "From email", type: "text" },
          { key: "admin_email", label: "Admin notification email", type: "text" },
        ],
      },
      {
        title: "Integrations",
        fields: [
          { key: "sheet_id", label: "Google Sheet ID", type: "text" },
        ],
      },
    ],
  },
};

export default function Config({ tenant }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    try {
      const [templates, configs] = await Promise.all([
        api.getTemplates(),
        api.getConfigs(tenant.id),
      ]);

      const tpl = templates.find((t) => t.slug === slug);
      if (!tpl) {
        navigate("/");
        return;
      }
      setTemplate(tpl);

      const existing = configs.find((c) => c.template_id === tpl.id);
      if (existing) {
        setConfigId(existing.id);
        setEnabled(existing.enabled);
        setValues(existing.config || {});
      } else {
        setValues(tpl.default_config || {});
      }
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      if (configId) {
        await api.updateConfig(tenant.id, configId, {
          enabled,
          config: values,
        });
      } else {
        const result = await api.createConfig(tenant.id, {
          template_slug: slug,
          enabled,
          config: values,
        });
        setConfigId(result.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateValue(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const fieldDef = TEMPLATE_FIELDS[slug];

  return (
    <div className="page-container">
      <button className="ghost back-btn" onClick={() => navigate("/")}>
        &larr; Back
      </button>

      <div className="config-header">
        <div>
          <h1>{template?.name}</h1>
          <p className="subtitle">Configure your settings</p>
        </div>
        <div className="enable-toggle">
          <span className="toggle-label">{enabled ? "Enabled" : "Disabled"}</span>
          <div
            className={`toggle ${enabled ? "on" : ""}`}
            onClick={() => setEnabled(!enabled)}
          >
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      {fieldDef?.sections.map((section) => (
        <div key={section.title} className="config-section">
          <h2>{section.title}</h2>
          <div className="section-fields">
            {section.fields.map((field) => {
              if (field.type === "toggle") {
                return (
                  <div
                    key={field.key}
                    className={`toggle-row ${field.disabled ? "disabled" : ""}`}
                  >
                    <div>
                      <div className="toggle-row-label">{field.label}</div>
                      {field.description && (
                        <div className="toggle-row-desc">{field.description}</div>
                      )}
                    </div>
                    <div
                      className={`toggle ${values[field.key] ? "on" : ""}`}
                      onClick={() =>
                        !field.disabled &&
                        updateValue(field.key, !values[field.key])
                      }
                    >
                      <div className="toggle-thumb" />
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.key} className="field">
                  <label>{field.label}</label>
                  <input
                    type="text"
                    value={values[field.key] || ""}
                    onChange={(e) => updateValue(field.key, e.target.value)}
                    placeholder={field.placeholder || ""}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="primary save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
      </button>
    </div>
  );
}
