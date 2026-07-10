import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Settings.css";

export default function Settings({ tenant, onLogout, onUpdate }) {
  const navigate = useNavigate();
  const [name, setName] = useState(tenant.name);
  const [email, setEmail] = useState(tenant.email);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const updated = await api.updateTenant(tenant.id, { name, email });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(tenant.api_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const planLabel = {
    free: "Free plan",
    basic: "Basic plan",
    pro: "Pro plan",
  };

  const planTemplates = {
    free: "2 automation templates",
    basic: "5 automation templates",
    pro: "Unlimited templates",
  };

  return (
    <div className="page-container">
      <button className="ghost back-btn" onClick={() => navigate("/")}>
        &larr; Back
      </button>

      <h1 className="settings-title">Settings</h1>

      <div className="settings-section">
        <h2>Account</h2>
        <div className="section-fields">
          <div className="field">
            <label>Business name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <button
          className="primary save-section-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
        </button>
      </div>

      <div className="settings-section">
        <h2>Plan</h2>
        <div className="plan-row">
          <div>
            <div className="plan-name">{planLabel[tenant.plan] || tenant.plan}</div>
            <div className="plan-desc">{planTemplates[tenant.plan] || ""}</div>
          </div>
          <button className="upgrade-btn">Upgrade</button>
        </div>
      </div>

      <div className="settings-section">
        <h2>API key</h2>
        <div className="api-key-row">
          <input
            type="text"
            value={tenant.api_key}
            readOnly
            className="api-key-input"
          />
          <button className="secondary" onClick={copyApiKey}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="api-key-hint">
          Use this key to identify your business in calendar event descriptions.
        </p>
      </div>

      <div className="settings-section danger-zone">
        <button className="ghost danger-btn" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
