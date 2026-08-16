import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./HttpRequest.css";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const SLUG_PREFIX = "http_request";
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function emptyRow() {
  return { key: "", value: "" };
}

function makeEditorState(cfg) {
  if (!cfg) {
    return {
      configId: null,
      name: "",
      enabled: false,
      url: "",
      method: "POST",
      headerRows: [emptyRow()],
      bodyTemplate: "",
    };
  }
  const c = cfg.config || {};
  const hdrs = c.headers || {};
  const rows = Object.entries(hdrs).map(([k, v]) => ({ key: k, value: v }));
  const slugSuffix = (cfg.template_slug || "").replace(/^http_request:/, "");
  return {
    configId: cfg.id,
    name: slugSuffix,
    enabled: cfg.enabled,
    url: c.url || "",
    method: c.method || "POST",
    headerRows: rows.length ? rows : [emptyRow()],
    bodyTemplate: c.body_template || "",
  };
}

export default function HttpRequest({ tenant }) {
  const navigate = useNavigate();

  // list
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // editor panel
  const [editing, setEditing] = useState(null); // null = list view
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [headerRows, setHeaderRows] = useState([emptyRow()]);
  const [bodyTemplate, setBodyTemplate] = useState("");

  // save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nameError, setNameError] = useState("");

  // test panel
  const [testPayload, setTestPayload] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const [payloadError, setPayloadError] = useState("");

  useEffect(() => {
    loadEndpoints();
  }, []);

  async function loadEndpoints() {
    setLoading(true);
    try {
      const configs = await api.getConfigs(tenant.id);
      const http = configs.filter((c) =>
        (c.template_slug || "").startsWith(SLUG_PREFIX + ":")
      );
      setEndpoints(http);
    } catch (err) {
      console.error("Failed to load HTTP configs:", err);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    const s = makeEditorState(null);
    applyEditorState(s);
    setEditing("new");
    resetTest();
  }

  function openExisting(cfg) {
    const s = makeEditorState(cfg);
    applyEditorState(s);
    setEditing(cfg.id);
    resetTest();
  }

  function applyEditorState(s) {
    setName(s.name);
    setEnabled(s.enabled);
    setUrl(s.url);
    setMethod(s.method);
    setHeaderRows(s.headerRows);
    setBodyTemplate(s.bodyTemplate);
    setSaved(false);
    setSaveError("");
    setNameError("");
  }

  function resetTest() {
    setTestPayload("{}");
    setTesting(false);
    setTestResult(null);
    setTestError("");
    setPayloadError("");
  }

  function closeEditor() {
    setEditing(null);
    resetTest();
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

  function validateName() {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("Name is required"); return false; }
    if (!SLUG_RE.test(trimmed)) {
      setNameError("Lowercase letters, numbers, and hyphens only (must start with a letter or number)");
      return false;
    }
    // check duplicate (only on new)
    if (editing === "new") {
      const slug = `${SLUG_PREFIX}:${trimmed}`;
      const dup = endpoints.find((e) => e.template_slug === slug);
      if (dup) { setNameError(`An endpoint named "${trimmed}" already exists`); return false; }
    }
    setNameError("");
    return true;
  }

  async function handleSave() {
    if (!validateName()) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const config = buildConfig();
      const slug = `${SLUG_PREFIX}:${name.trim()}`;
      if (editing !== "new") {
        await api.updateConfig(tenant.id, editing, { enabled, config });
        setEndpoints((prev) =>
          prev.map((e) =>
            e.id === editing
              ? { ...e, enabled, config, template_slug: slug }
              : e
          )
        );
      } else {
        const result = await api.createConfig(tenant.id, {
          template_slug: slug,
          enabled,
          config,
        });
        setEndpoints((prev) => [...prev, result]);
        setEditing(result.id);
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
    const slug = `${SLUG_PREFIX}:${name.trim()}`;
    setTesting(true);
    try {
      const result = await api.triggerEngine(slug, tenant.api_key, parsed);
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

  // ── LIST VIEW ────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="page-container">
        <button className="ghost back-btn" onClick={() => navigate("/")}>
          &larr; Back
        </button>

        <div className="config-header">
          <div>
            <h1>HTTP Request</h1>
            <p className="subtitle">Outbound HTTP endpoints for your automations</p>
          </div>
          <button className="primary" onClick={openNew}>+ New endpoint</button>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-secondary)", marginTop: 24 }}>Loading...</p>
        ) : endpoints.length === 0 ? (
          <div className="http-empty">
            <div className="http-empty-icon">🔗</div>
            <h3>No endpoints yet</h3>
            <p>Create your first HTTP Request endpoint to trigger outbound webhooks from your automations.</p>
            <button className="primary" onClick={openNew}>+ New endpoint</button>
          </div>
        ) : (
          <div className="endpoint-list">
            {endpoints.map((cfg) => {
              const suffix = (cfg.template_slug || "").replace(/^http_request:/, "");
              const cfgData = cfg.config || {};
              return (
                <div
                  key={cfg.id}
                  className="endpoint-card"
                  onClick={() => openExisting(cfg)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openExisting(cfg)}
                >
                  <div className="endpoint-card-left">
                    <div className="endpoint-name">{suffix}</div>
                    <div className="endpoint-meta">
                      <span className={`method-badge method-${(cfgData.method || "POST").toLowerCase()}`}>
                        {cfgData.method || "POST"}
                      </span>
                      <span className="endpoint-url">{cfgData.url || <em>No URL set</em>}</span>
                    </div>
                  </div>
                  <div className="endpoint-card-right">
                    <span className={`status-pill ${cfg.enabled ? "on" : "off"}`}>
                      {cfg.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="endpoint-arrow">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR VIEW ──────────────────────────────────────────────────
  const isNew = editing === "new";
  const fullSlug = name.trim() ? `${SLUG_PREFIX}:${name.trim()}` : `${SLUG_PREFIX}:…`;

  return (
    <div className="page-container">
      <button className="ghost back-btn" onClick={closeEditor}>
        &larr; All endpoints
      </button>

      <div className="config-header">
        <div>
          <h1>{isNew ? "New endpoint" : name}</h1>
          <p className="subtitle endpoint-slug-preview">{fullSlug}</p>
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

      {/* Name */}
      <div className="config-section">
        <h2>Endpoint name</h2>
        <p className="section-hint">
          Sets the slug suffix: <code>{fullSlug}</code>. Lowercase letters, numbers, hyphens.
          {!isNew && " Name cannot be changed after creation."}
        </p>
        <div className="field">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(""); }}
            placeholder="e.g. crm, slack, notify"
            disabled={!isNew}
            className={nameError ? "input-error" : ""}
          />
          {nameError && <p className="field-error">{nameError}</p>}
        </div>
      </div>

      {/* Request */}
      <div className="config-section">
        <h2>Request</h2>
        <div className="section-fields">
          <div className="field method-url-row">
            <div className="field method-field">
              <label>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
          placeholder={'{"name": "{{customer_name}}", "amount": "{{amount}}"}' }
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
          disabled={testing || !url.trim() || !name.trim()}
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
              {testResult.result?.status_code ? `HTTP ${testResult.result.status_code}` : "Response"}
            </span>
            <pre>{JSON.stringify(testResult.result?.body ?? testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
