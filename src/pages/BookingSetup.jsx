import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./BookingSetup.css";

const API_PUBLIC_BASE = "https://dashboard.autoflow.ivanit.work";

export default function BookingSetup({ tenant, onLogout }) {
  const [tab, setTab] = useState("setup");

  // Setup form state
  const [form, setForm] = useState({
    slug: "",
    title: "",
    description: "",
    cta_label: "",
    message_label: "",
    message_placeholder: "",
    confirmation_message: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [hasPage, setHasPage] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.getBookingPageConfig()
      .then(data => {
        if (data) {
          setForm({
            slug: data.slug || "",
            title: data.title || "",
            description: data.description || "",
            cta_label: data.cta_label || "",
            message_label: data.message_label || "",
            message_placeholder: data.message_placeholder || "",
            confirmation_message: data.confirmation_message || "",
          });
          setHasPage(true);
        }
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "submissions") return;
    setSubsLoading(true);
    setSubsError(null);
    api.getSubmissions()
      .then(setSubmissions)
      .catch(err => setSubsError(err.message || "Failed to load submissions."))
      .finally(() => setSubsLoading(false));
  }, [tab]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await api.createOrUpdateBookingPage(form);
      setSaveSuccess(true);
      setHasPage(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = form.slug ? API_PUBLIC_BASE + "/b/" + form.slug : null;

  return (
    <div className="bsetup-shell">
      <header className="bsetup-header">
        <div className="bsetup-header-inner">
          <div className="bsetup-header-left">
            <Link to="/" className="bsetup-back">← Back</Link>
            <h1 className="bsetup-page-title">Booking Page</h1>
          </div>
          <button className="bsetup-logout" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="bsetup-main">
        <div className="bsetup-tabs">
          <button
            className={"bsetup-tab" + (tab === "setup" ? " bsetup-tab-active" : "")}
            onClick={() => setTab("setup")}
          >Page Setup</button>
          <button
            className={"bsetup-tab" + (tab === "submissions" ? " bsetup-tab-active" : "")}
            onClick={() => setTab("submissions")}
          >Submissions</button>
        </div>

        {tab === "setup" && (
          <div className="bsetup-panel">
            {pageLoading ? (
              <div className="bsetup-loading">
                <div className="bsetup-sk bsetup-sk-field" />
                <div className="bsetup-sk bsetup-sk-field" />
                <div className="bsetup-sk bsetup-sk-field" />
              </div>
            ) : (
              <form className="bsetup-form" onSubmit={handleSave} noValidate>
                <div className="bsetup-section">
                  <h2 className="bsetup-section-title">Page identity</h2>

                  <div className="bsetup-field">
                    <label htmlFor="bs-slug">URL slug <span className="bsetup-required">*</span></label>
                    <div className="bsetup-slug-row">
                      <span className="bsetup-slug-prefix">/b/</span>
                      <input
                        id="bs-slug"
                        name="slug"
                        type="text"
                        value={form.slug}
                        onChange={handleChange}
                        required
                        placeholder="my-business"
                        pattern="[a-z0-9-]+"
                        title="Lowercase letters, numbers, and hyphens only"
                      />
                    </div>
                    {publicUrl && (
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="bsetup-preview-link">
                        {publicUrl} ↗
                      </a>
                    )}
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-title">Heading</label>
                    <input
                      id="bs-title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Book a consultation"
                    />
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-description">Description</label>
                    <textarea
                      id="bs-description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Tell customers what they're booking…"
                    />
                  </div>
                </div>

                <div className="bsetup-section">
                  <h2 className="bsetup-section-title">Form labels</h2>

                  <div className="bsetup-field">
                    <label htmlFor="bs-cta">Button label</label>
                    <input
                      id="bs-cta"
                      name="cta_label"
                      type="text"
                      value={form.cta_label}
                      onChange={handleChange}
                      placeholder="Send request"
                    />
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-msg-label">Message field label</label>
                    <input
                      id="bs-msg-label"
                      name="message_label"
                      type="text"
                      value={form.message_label}
                      onChange={handleChange}
                      placeholder="Message"
                    />
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-msg-placeholder">Message placeholder text</label>
                    <input
                      id="bs-msg-placeholder"
                      name="message_placeholder"
                      type="text"
                      value={form.message_placeholder}
                      onChange={handleChange}
                      placeholder="Tell us what you need…"
                    />
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-confirm">Confirmation message</label>
                    <textarea
                      id="bs-confirm"
                      name="confirmation_message"
                      value={form.confirmation_message}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Thanks for reaching out. We'll be in touch shortly."
                    />
                  </div>
                </div>

                {saveError && <p className="bsetup-error">{saveError}</p>}
                {saveSuccess && <p className="bsetup-success">Saved successfully.</p>}

                <div className="bsetup-actions">
                  <button className="bsetup-save" type="submit" disabled={saving}>
                    {saving ? "Saving…" : hasPage ? "Update page" : "Create page"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {tab === "submissions" && (
          <div className="bsetup-panel">
            {subsLoading && (
              <div className="bsetup-loading">
                <div className="bsetup-sk bsetup-sk-row" />
                <div className="bsetup-sk bsetup-sk-row" />
                <div className="bsetup-sk bsetup-sk-row" />
              </div>
            )}
            {subsError && <p className="bsetup-error">{subsError}</p>}
            {!subsLoading && !subsError && submissions.length === 0 && (
              <div className="bsetup-empty">
                <p className="bsetup-empty-icon">📥</p>
                <p className="bsetup-empty-title">No submissions yet</p>
                <p className="bsetup-empty-sub">When customers submit your booking form, they'll appear here.</p>
              </div>
            )}
            {!subsLoading && submissions.length > 0 && (
              <div className="bsetup-subs-list">
                {submissions.map(sub => (
                  <div key={sub.id} className="bsetup-sub-card">
                    <div
                      className="bsetup-sub-header"
                      onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setExpanded(expanded === sub.id ? null : sub.id)}
                    >
                      <div className="bsetup-sub-meta">
                        <span className="bsetup-sub-name">{sub.name || "(no name)"}</span>
                        <span className="bsetup-sub-email">{sub.email}</span>
                      </div>
                      <span className="bsetup-sub-date">
                        {new Date(sub.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="bsetup-sub-chevron">{expanded === sub.id ? "▲" : "▼"}</span>
                    </div>
                    {expanded === sub.id && (
                      <div className="bsetup-sub-body">
                        {sub.phone && <p><strong>Phone:</strong> {sub.phone}</p>}
                        {sub.message && <p><strong>Message:</strong> {sub.message}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
