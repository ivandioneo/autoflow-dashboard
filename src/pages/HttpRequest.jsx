import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./HttpRequest.css";

const SLUG_PREFIX = "http_request:";
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function emptyForm() {
  return {
    slugSuffix: "",
    url: "",
    method: "POST",
    headersRaw: "",
    bodyTemplate: "",
    enabled: true,
  };
}

function parseHeaders(raw) {
  const result = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

function headersToRaw(headers) {
  if (!headers || typeof headers !== "object") return "";
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export default function HttpRequest({ tenant, onLogout }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm());
  const [existingConfig, setExistingConfig] = useState(null); // null = no config yet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: "success"|"error", text }

  // Test panel
  const [testPayload, setTestPayload] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { status, body }

  // ------------------------------------------------------------------
  // Load existing http_request:* configs on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const configs = await api.getConfigs(tenant.id);
      // Pick the first http_request:* config if any
      const existing = configs.find(
        (c) => c.template && c.template.slug && c.template.slug.startsWith(SLUG_PREFIX)
      );
      if (existing) {
        setExistingConfig(existing);
        const cfg = existing.config || {};
        setForm({
          slugSuffix: existing.template.slug.slice(SLUG_PREFIX.length),
          url: cfg.url || "",
          method: cfg.method || "POST",
          headersRaw: headersToRaw(cfg.headers),
          bodyTemplate: cfg.body_template || "",
          enabled: existing.enabled,
        });
      }
    } catch (err) {
      console.error("Failed to load configs:", err);
    } finally {
      setLoading(false);
    }
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ------------------------------------------------------------------
  // Save (create or update)
  // ------------------------------------------------------------------
  async function handleSave(e) {
    e.preventDefault();
    setSaveMsg(null);

    if (!form.slugSuffix.trim()) {
      setSaveMsg({ type: "error", text: "Integration name is required." });
      return;
    }
    if (!form.url.trim()) {
      setSaveMsg({ type: "error", text: "Destination URL is required." });
      return;
    }

    const configPayload = {
      url: form.url.trim(),
      method: form.method,
      ...(form.headersRaw.trim() ? { headers: parseHeaders(form.headersRaw) } : {}),
      ...(form.bodyTemplate.trim() ? { body_template: form.bodyTemplate.trim() } : {}),
    };

    setSaving(true);
    try {
      if (existingConfig) {
        await api.updateConfig(tenant.id, existingConfig.id, {
          enabled: form.enabled,
          config: configPayload,
        });
      } else {
        const slug = SLUG_PREFIX + form.slugSuffix.trim().toLowerCase().replace(/\s+/g, "-");
        const created = await api.createConfig(tenant.id, {
          template_slug: slug,
          enabled: form.enabled,
          config: configPayload,
        });
        setExistingConfig(created);
      }
      setSaveMsg({ type: "success", text: "Saved successfully." });
    } catch (err) {
      setSaveMsg({ type: "error", text: err.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------------
  // Test
  // ------------------------------------------------------------------
  async function handleTest(e) {
    e.preventDefault();
    setTestResult(null);

    if (!existingConfig) {
      setTestResult({ type: "error", text: "Save your configuration first before testing." });
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(testPayload);
    } catch {
      setTestResult({ type: "error", text: "Test payload must be valid JSON." });
      return;
    }

    setTesting(true);
    try {
      const slug = existingConfig.template.slug;
      const result = await api.triggerAutomation(slug, parsedPayload);
      setTestResult({
        type: "success",
        text: JSON.stringify(result, null, 2),
      });
    } catch (err) {
      setTestResult({ type: "error", text: err.message || "Test failed." });
    } finally {
      setTesting(false);
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const isEdit = !!existingConfig;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>HTTP Request</h1>
          <p className="subtitle">Send an outbound HTTP call from an automation trigger</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => navigate("/")}>
            Automations
          </button>
          <button className="secondary" onClick={() => navigate("/logs")}>
            Run History
          </button>
          <button className="secondary" onClick={() => navigate("/booking")}>
            Booking
          </button>
          <button className="secondary" onClick={() => navigate("/settings")}>
            Settings
          </button>
          <button className="ghost" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      <div className="hr-layout">
        {/* Config form */}
        <section className="hr-card">
          <div className="hr-card-header">
            <h2>{isEdit ? "Edit Integration" : "New Integration"}</h2>
            {isEdit && (
              <span className={`hr-badge ${form.enabled ? "active" : "inactive"}`}>
                {form.enabled ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="hr-form">
            {/* Integration name */}
            <div className="hr-field">
              <label htmlFor="hr-name">Integration name</label>
              <div className="hr-slug-input">
                <span className="hr-slug-prefix">http_request:</span>
                <input
                  id="hr-name"
                  type="text"
                  value={form.slugSuffix}
                  onChange={(e) => set("slugSuffix", e.target.value)}
                  placeholder="my-webhook"
                  disabled={isEdit}
                  required
                />
              </div>
              {isEdit && (
                <p className="hr-hint">Slug cannot be changed after creation.</p>
              )}
            </div>

            {/* URL */}
            <div className="hr-field">
              <label htmlFor="hr-url">Destination URL</label>
              <input
                id="hr-url"
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://hooks.example.com/webhook"
                required
              />
            </div>

            {/* Method */}
            <div className="hr-field hr-field-sm">
              <label htmlFor="hr-method">HTTP Method</label>
              <select
                id="hr-method"
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Headers */}
            <div className="hr-field">
              <label htmlFor="hr-headers">
                Extra headers
                <span className="hr-optional">optional</span>
              </label>
              <textarea
                id="hr-headers"
                value={form.headersRaw}
                onChange={(e) => set("headersRaw", e.target.value)}
                placeholder={"Authorization: Bearer token\nX-Custom-Header: value"}
                rows={3}
              />
              <p className="hr-hint">One header per line in <code>Key: Value</code> format.</p>
            </div>

            {/* Body template */}
            <div className="hr-field">
              <label htmlFor="hr-body">
                Body template
                <span className="hr-optional">optional</span>
              </label>
              <textarea
                id="hr-body"
                value={form.bodyTemplate}
                onChange={(e) => set("bodyTemplate", e.target.value)}
                placeholder={'{ "name": "{{name}}", "email": "{{email}}" }'}
                rows={5}
                className="hr-mono"
              />
              <p className="hr-hint">
                JSON string. Use <code>{"{{key}}"}</code> to interpolate values from the trigger payload.
              </p>
            </div>

            {/* Enabled toggle */}
            <div className="hr-field hr-field-toggle">
              <label className="hr-toggle-label">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => set("enabled", e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>

            {saveMsg && (
              <p className={`hr-msg hr-msg-${saveMsg.type}`}>{saveMsg.text}</p>
            )}

            <div className="hr-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </section>

        {/* Test panel */}
        <section className="hr-card">
          <div className="hr-card-header">
            <h2>Test</h2>
          </div>
          <p className="hr-test-desc">
            Send a test trigger to your configured URL using a sample payload.
            {!isEdit && " Save the integration first to enable testing."}
          </p>

          <form onSubmit={handleTest} className="hr-form">
            <div className="hr-field">
              <label htmlFor="hr-test-payload">Sample payload (JSON)</label>
              <textarea
                id="hr-test-payload"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={5}
                className="hr-mono"
                placeholder='{"name": "Jane", "email": "jane@example.com"}'
              />
            </div>

            <div className="hr-actions">
              <button
                type="submit"
                className="secondary"
                disabled={testing || !isEdit}
              >
                {testing ? "Sending…" : "Send Test"}
              </button>
            </div>
          </form>

          {testResult && (
            <div className={`hr-test-result hr-test-result-${testResult.type}`}>
              <p className="hr-test-result-label">
                {testResult.type === "success" ? "✓ Response" : "✗ Error"}
              </p>
              <pre>{testResult.text}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
