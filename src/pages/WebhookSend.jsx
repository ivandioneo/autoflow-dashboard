import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./HttpRequest.css";

const SLUG = "webhook:default";

export default function WebhookSend({ tenant }) {
  const navigate = useNavigate();

  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [includeFields, setIncludeFields] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [testPayload, setTestPayload] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const [payloadError, setPayloadError] = useState("");

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    try {
      const configs = await api.getConfigs(tenant.id);
      const existing = configs.find(
        (c) => c.template_slug === SLUG || (c.template && c.template.slug === SLUG)
      );
      if (existing) {
        setConfigId(existing.id);
        setEnabled(existing.enabled);
        const cfg = existing.config || {};
        setUrl(cfg.url || "");
        setSecret(cfg.secret || "");
        const fields = cfg.include_fields || [];
        setIncludeFields(fields.join(", "));
      }
    } catch (err) {
      console.error("Failed to load Webhook config:", err);
    } finally {
      setLoading(false);
    }
  }

  function buildConfig() {
    const fields = includeFields
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    return {
      url: url.trim(),
      ...(secret.trim() ? { secret: secret.trim() } : {}),
      ...(fields.length ? { include_fields: fields } : {}),
    };
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const config = buildConfig();
      if (configId) {
        await api.updateConfig(tenant.id, configId, { enabled, config });
      } else {
        const result = await api.createConfig(tenant.id, { template_slug: SLUG, enabled, config });
        setConfigId(result.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setPayloadError("");
    setTestError("");
    setTestResult(null);
    let parsed;
    try {
      parsed = JSON.parse(testPayload);
    } catch {
      setPayloadError("Payload must be valid JSON");
      return;
    }
    setTesting(true);
    try {
      const result = await api.triggerEngine(SLUG, tenant.api_key, parsed);
      setTestResult(result);
    } catch (err) {
      setTestError(err.message || "Request failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="page-container"><p style={{ color: "var(--text-secondary)" }}>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <button className="ghost back-btn" onClick={() => navigate("/")}>&larr; Back</button>

      <div className="config-header">
        <div>
          <h1>Webhook</h1>
          <p className="subtitle">POST your automation payload to any external URL with optional signature verification</p>
        </div>
        <div className="enable-toggle">
          <span className="toggle-label">{enabled ? "Enabled" : "Disabled"}</span>
          <div
            className={`toggle ${enabled ? "on" : ""}`}
            onClick={() => setEnabled((v) => !v)}
            role="switch"
            aria-checked={enabled}
            tabIndex={0}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setEnabled((v) => !v)}
          >
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Destination</h2>
        <div className="section-fields">
          <div className="field">
            <label>Webhook URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Security</h2>
        <div className="section-fields">
          <div className="field">
            <label>Signing secret (optional)</label>
            <p className="section-hint" style={{ marginBottom: "8px" }}>
              If set, AutoFlow adds an <code>X-AutoFlow-Signature: sha256=&lt;hex&gt;</code> header so your endpoint can verify the request.
            </p>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="your-webhook-secret"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Payload filter (optional)</h2>
        <div className="section-fields">
          <div className="field">
            <label>Include fields</label>
            <p className="section-hint" style={{ marginBottom: "8px" }}>
              Comma-separated list of payload keys to forward. Leave empty to forward the entire payload.
            </p>
            <input
              type="text"
              value={includeFields}
              onChange={(e) => setIncludeFields(e.target.value)}
              placeholder="customer_name, email, service_name"
            />
          </div>
        </div>
      </div>

      {saveError && <p className="field-error">{saveError}</p>}
      <button className="primary save-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved \u2713" : "Save changes"}
      </button>

      <div className="config-section test-section">
        <h2>Send test webhook</h2>
        <p className="section-hint">Fires a real POST to your saved URL. Save first.</p>
        <div className="field">
          <label>Test payload (JSON)</label>
          <textarea
            className="body-textarea"
            value={testPayload}
            onChange={(e) => { setTestPayload(e.target.value); setPayloadError(""); }}
            rows={4}
            spellCheck={false}
            placeholder='{"customer_name": "Alice", "email": "alice@example.com"}'
          />
          {payloadError && <p className="field-error">{payloadError}</p>}
        </div>
        <button
          className="secondary test-btn"
          onClick={handleTest}
          disabled={testing || !url.trim()}
        >
          {testing ? "Sending..." : "Send test webhook"}
        </button>

        {testError && (
          <div className="test-result error">
            <span className="result-label">Error</span>
            <pre>{testError}</pre>
          </div>
        )}

        {testResult && (
          <div className={`test-result ${testResult.result?.status_code && testResult.result.status_code < 300 ? "success" : "warn"}`}>
            <span className="result-label">
              {testResult.result?.status_code ? `HTTP ${testResult.result.status_code}` : "Response"}
            </span>
            <pre>{JSON.stringify(testResult.result?.body ?? testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
