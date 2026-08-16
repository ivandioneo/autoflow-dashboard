import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./HttpRequest.css";

const SLUG = "email:default";

export default function EmailSend({ tenant }) {
  const navigate = useNavigate();

  const [configId, setConfigId] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [replyTo, setReplyTo] = useState("");

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
        setTo(cfg.to || "");
        setSubject(cfg.subject || "");
        setBodyHtml(cfg.body_html || "");
        setReplyTo(cfg.reply_to || "");
      }
    } catch (err) {
      console.error("Failed to load Email config:", err);
    } finally {
      setLoading(false);
    }
  }

  function buildConfig() {
    return {
      to: to.trim(),
      subject: subject.trim(),
      body_html: bodyHtml.trim(),
      ...(replyTo.trim() ? { reply_to: replyTo.trim() } : {}),
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
          <h1>Email</h1>
          <p className="subtitle">Send a templated HTML email from your automations via Resend</p>
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
        <h2>Recipient</h2>
        <p className="section-hint">Use <code>{"{{key}}"}</code> to fill values from the trigger payload — e.g. <code>{"{{email}}"}</code></p>
        <div className="section-fields">
          <div className="field">
            <label>To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="{{email}} or a fixed address"
            />
          </div>
          <div className="field">
            <label>Reply-to (optional)</label>
            <input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="support@yourdomain.com"
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h2>Content</h2>
        <div className="section-fields">
          <div className="field">
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your {{service_name}} booking is confirmed"
            />
          </div>
          <div className="field">
            <label>Body (HTML)</label>
            <p className="section-hint" style={{ marginBottom: "8px" }}>HTML is supported. Use <code>{"{{key}}"}</code> for dynamic values.</p>
            <textarea
              className="body-textarea"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder={`<p>Hi {{customer_name}},</p>\n<p>Your booking for <strong>{{service_name}}</strong> is confirmed.</p>`}
              rows={8}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {saveError && <p className="field-error">{saveError}</p>}
      <button className="primary save-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved \u2713" : "Save changes"}
      </button>

      <div className="config-section test-section">
        <h2>Send test email</h2>
        <p className="section-hint">Sends a real email using your saved config. Save first.</p>
        <div className="field">
          <label>Test payload (JSON)</label>
          <textarea
            className="body-textarea"
            value={testPayload}
            onChange={(e) => { setTestPayload(e.target.value); setPayloadError(""); }}
            rows={4}
            spellCheck={false}
            placeholder='{"customer_name": "Alice", "service_name": "Haircut"}'
          />
          {payloadError && <p className="field-error">{payloadError}</p>}
        </div>
        <button
          className="secondary test-btn"
          onClick={handleTest}
          disabled={testing || !to.trim() || !subject.trim()}
        >
          {testing ? "Sending..." : "Send test email"}
        </button>

        {testError && (
          <div className="test-result error">
            <span className="result-label">Error</span>
            <pre>{testError}</pre>
          </div>
        )}

        {testResult && (
          <div className={`test-result ${testResult.success !== false ? "success" : "warn"}`}>
            <span className="result-label">
              {testResult.result?.resend_id ? `Delivered — ${testResult.result.resend_id}` : "Response"}
            </span>
            <pre>{JSON.stringify(testResult.result ?? testResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
