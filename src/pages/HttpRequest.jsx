import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./HttpRequest.css";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function emptyRow() {
  return { key: "", value: "" };
}

export default function HttpRequest({ tenant }) {
  const navigate = useNavigate();

  // --- config state ---
  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [headerRows, setHeaderRows] = useState([emptyRow()]);
  const [bodyTemplate, setBodyTemplate] = useState("");

  // --- save state ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // --- test panel state ---
  const [testPayload, setTestPayload] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const [payloadError, setPayloadError] = useState("");

  const SLUG = "http_request:default";

  useEffect(() => {
    loadConfig();
  }, []);

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
        setMethod(cfg.method || "POST");
        setBodyTemplate(cfg.body_template || "");
        const hdrs = cfg.headers || {};
        const rows = Object.entries(hdrs).map(([k, v]) => ({ key: k, value: v }));
        setHeaderRows(rows.length ? rows : [emptyRow()]);
      }
    } catch (err) {
      console.error("Failed to load HTTP Request config:", err);
    } finally {
      setLoading(false);
    }
  }

  function buildConfig() {
    const headers = {};
    headerRows.forEach(({ key, value }) => {
      if (key.trim()) headers[key.trim()] = value;
    });
    return {
      url: url.trim(),
      method,
      headers,
      ...(bodyTemplate.trim() ? { body_template: bodyTemplate.trim() } : {}),
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
        const result = await api.createConfig(tenant.id, {
          template_slug: SLUG,
          enabled,
          config,
        });
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

  function updateHeaderRow(index, field, value) {
    setHeaderRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addHeaderRow() {
    setHeaderRows((prev) => [...prev, emptyRow()]);
  }

  function removeHeaderRow(index) {
    setHeaderRows((prev) => prev.filter((_, i) => i !== index));
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
      <button className="ghost back-btn" onClick={() => navigate("/")}>
        &larr; Back
      </button>

      {/* Header */}
      <div className="config-header">
        <div>
          <h1>HTTP Request</h1>
          <p className="subtitle">Trigger an outbound HTTP request from your automations</p>
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

      {/* Request config */}
      <div className="config-section">
        <h2>Request</h2>
        <div className="section-fields">
          <div className="field method-url-row">
            <div className="field method-field">
              <label>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field url-field">
              <label>Destination URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Headers */}
      <div className="config-section">
        <h2>Headers</h2>
        <div className="section-fields">
          {headerRows.map((row, i) => (
            <div key={i} className="header-row">
              <input
                type="text"
                placeholder="Header name"
                value={row.key}
                onChange={(e) => updateHeaderRow(i, "key", e.target.value)}
              />
              <input
                type="text"
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateHeaderRow(i, "value", e.target.value)}
              />
              <button
                className="ghost remove-btn"
                onClick={() => removeHeaderRow(i)}
                aria-label="Remove header"
              >
                &times;
              </button>
            </div>
          ))}
          <button className="ghost add-header-btn" onClick={addHeaderRow}>
            + Add header
          </button>
        </div>
      </div>

      {/* Body template */}
      <div className="config-section">
        <h2>Body template</h2>
        <p className="section-hint">
          Optional JSON body. Use <code>{"{{key}}"}</code> placeholders — values are filled from the trigger payload.
        </p>
        <textarea
          className="body-textarea"
          value={bodyTemplate}
          onChange={(e) => setBodyTemplate(e.target.value)}
          placeholder={'{ "name": "{{customer_name}}", "amount": "{{amount}}" }'}
          rows={6}
          spellCheck={false}
        />
      </div>

      {/* Save */}
      {saveError && <p className="field-error">{saveError}</p>}
      <button
        className="primary save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>

      {/* Test panel */}
      <div className="config-section test-section">
        <h2>Test request</h2>
        <p className="section-hint">
          Send a live request using the config above. Make sure you've saved first.
        </p>
        <div className="field">
          <label>Test payload (JSON)</label>
          <textarea
            className="body-textarea"
            value={testPayload}
            onChange={(e) => { setTestPayload(e.target.value); setPayloadError(""); }}
            rows={4}
            spellCheck={false}
            placeholder='{"customer_name": "Alice"}'
          />
          {payloadError && <p className="field-error">{payloadError}</p>}
        </div>
        <button
          className="secondary test-btn"
          onClick={handleTest}
          disabled={testing || !url.trim()}
        >
          {testing ? "Sending..." : "Send test request"}
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
              {testResult.result?.status_code
                ? `HTTP ${testResult.result.status_code}`
                : "Response"}
            </span>
            <pre>{JSON.stringify(testResult.result?.body ?? testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
