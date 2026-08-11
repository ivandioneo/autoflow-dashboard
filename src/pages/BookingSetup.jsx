import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./BookingSetup.css";

const API_PUBLIC_BASE = "https://dashboard.autoflow.ivanit.work";

export default function BookingSetup({ tenant, onLogout }) {
  const [tab, setTab] = useState("setup");

  // Setup form state — fields match BookingPageCreate/Update schema exactly
  const [form, setForm] = useState({
    slug: "",
    business_name: "",
    description: "",
    notify_email: "",
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [hasPage, setHasPage] = useState(false);

  // Leads state
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.getBookingPageConfig()
      .then(data => {
        if (data) {
          setForm({
            slug: data.slug || "",
            business_name: data.business_name || "",
            description: data.description || "",
            notify_email: data.notify_email || "",
            enabled: data.enabled !== undefined ? data.enabled : true,
          });
          setHasPage(true);
        }
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "leads") return;
    setLeadsLoading(true);
    setLeadsError(null);
    api.getLeads()
      .then(setLeads)
      .catch(err => setLeadsError(err.message || "Failed to load leads."))
      .finally(() => setLeadsLoading(false));
  }, [tab]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = {
        slug: form.slug.trim(),
        business_name: form.business_name.trim(),
        description: form.description.trim() || null,
        notify_email: form.notify_email.trim() || null,
        enabled: form.enabled,
      };
      await api.createOrUpdateBookingPage(payload);
      setSaveSuccess(true);
      setHasPage(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(leadId, status) {
    try {
      const updated = await api.updateLeadStatus(leadId, status);
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
    } catch (err) {
      alert(err.message || "Failed to update status.");
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
            className={"bsetup-tab" + (tab === "leads" ? " bsetup-tab-active" : "")}
            onClick={() => setTab("leads")}
          >Leads</button>
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
                        pattern="[a-z0-9][a-z0-9\-]{1,98}[a-z0-9]"
                        title="Lowercase letters, numbers, and hyphens only (3–100 chars)"
                      />
                    </div>
                    {publicUrl && (
                      <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="bsetup-preview-link">
                        {publicUrl} ↗
                      </a>
                    )}
                  </div>

                  <div className="bsetup-field">
                    <label htmlFor="bs-business-name">Business name <span className="bsetup-required">*</span></label>
                    <input
                      id="bs-business-name"
                      name="business_name"
                      type="text"
                      value={form.business_name}
                      onChange={handleChange}
                      required
                      placeholder="Acme Consulting"
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

                  <div className="bsetup-field">
                    <label htmlFor="bs-notify-email">Notification email</label>
                    <input
                      id="bs-notify-email"
                      name="notify_email"
                      type="email"
                      value={form.notify_email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                    />
                    <span className="bsetup-hint">Where new lead notifications are sent. Defaults to your account email.</span>
                  </div>

                  <div className="bsetup-field bsetup-field-inline">
                    <label htmlFor="bs-enabled">
                      <input
                        id="bs-enabled"
                        name="enabled"
                        type="checkbox"
                        checked={form.enabled}
                        onChange={handleChange}
                      />
                      Page enabled (publicly accessible)
                    </label>
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

        {tab === "leads" && (
          <div className="bsetup-panel">
            {leadsLoading && (
              <div className="bsetup-loading">
                <div className="bsetup-sk bsetup-sk-row" />
                <div className="bsetup-sk bsetup-sk-row" />
                <div className="bsetup-sk bsetup-sk-row" />
              </div>
            )}
            {leadsError && <p className="bsetup-error">{leadsError}</p>}
            {!leadsLoading && !leadsError && leads.length === 0 && (
              <div className="bsetup-empty">
                <p className="bsetup-empty-icon">📥</p>
                <p className="bsetup-empty-title">No leads yet</p>
                <p className="bsetup-empty-sub">When customers submit your booking form, they'll appear here.</p>
              </div>
            )}
            {!leadsLoading && leads.length > 0 && (
              <div className="bsetup-subs-list">
                {leads.map(lead => (
                  <div key={lead.id} className="bsetup-sub-card">
                    <div
                      className="bsetup-sub-header"
                      onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === "Enter" && setExpanded(expanded === lead.id ? null : lead.id)}
                    >
                      <div className="bsetup-sub-meta">
                        <span className="bsetup-sub-name">{lead.customer_name || "(no name)"}</span>
                        <span className="bsetup-sub-email">{lead.phone}</span>
                      </div>
                      <span className={"bsetup-lead-status bsetup-lead-status--" + lead.status}>{lead.status}</span>
                      <span className="bsetup-sub-date">
                        {new Date(lead.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="bsetup-sub-chevron">{expanded === lead.id ? "▲" : "▼"}</span>
                    </div>
                    {expanded === lead.id && (
                      <div className="bsetup-sub-body">
                        {lead.service_name && <p><strong>Service:</strong> {lead.service_name}</p>}
                        {lead.preferred_datetime && <p><strong>Preferred time:</strong> {lead.preferred_datetime}</p>}
                        {lead.email && <p><strong>Email:</strong> {lead.email}</p>}
                        {lead.notes && <p><strong>Notes:</strong> {lead.notes}</p>}
                        <div className="bsetup-lead-actions">
                          {["new", "seen", "done", "dismissed"].map(s => (
                            <button
                              key={s}
                              className={"bsetup-status-btn" + (lead.status === s ? " bsetup-status-btn--active" : "")}
                              onClick={() => handleStatusChange(lead.id, s)}
                              disabled={lead.status === s}
                            >{s}</button>
                          ))}
                        </div>
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
