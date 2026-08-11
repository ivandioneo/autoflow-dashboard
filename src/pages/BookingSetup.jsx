/**
 * Tenant dashboard page — create or edit their booking page.
 * Route: /booking-setup (authenticated)
 * Uses POST /booking/page to create, PUT /booking/page to update.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./BookingSetup.css";

const MODES = [
  { value: "both", label: "Booking & Quotes" },
  { value: "booking", label: "Bookings only" },
  { value: "quote", label: "Quote requests only" },
];

const EMPTY_SERVICE = { name: "", duration_min: "", price: "" };

function ServiceRow({ svc, index, onChange, onRemove }) {
  return (
    <div className="bs-service-row">
      <input
        className="bs-input bs-input--name"
        type="text"
        placeholder="Service name"
        value={svc.name}
        onChange={(e) => onChange(index, "name", e.target.value)}
        required
      />
      <input
        className="bs-input bs-input--short"
        type="number"
        placeholder="Min"
        min="1"
        value={svc.duration_min}
        onChange={(e) => onChange(index, "duration_min", e.target.value)}
      />
      <input
        className="bs-input bs-input--short"
        type="text"
        placeholder="Price"
        value={svc.price}
        onChange={(e) => onChange(index, "price", e.target.value)}
      />
      <button
        type="button"
        className="bs-remove-btn"
        onClick={() => onRemove(index)}
        aria-label="Remove service"
      >
        &#10005;
      </button>
    </div>
  );
}

export default function BookingSetup({ tenant }) {
  const navigate = useNavigate();
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    slug: "",
    business_name: tenant.name || "",
    tagline: "",
    whatsapp_number: "",
    notification_email: "",
    mode: "both",
    active: true,
    services: [],
  });

  useEffect(() => {
    api
      .getOwnBookingPage()
      .then((data) => {
        setExisting(data);
        setForm({
          slug: data.slug,
          business_name: data.business_name,
          tagline: data.tagline || "",
          whatsapp_number: data.whatsapp_number || "",
          notification_email: data.notification_email || "",
          mode: data.mode,
          active: data.active,
          services: (data.services || []).map((s) => ({
            name: s.name || "",
            duration_min: s.duration_min ?? "",
            price: s.price || "",
          })),
        });
      })
      .catch((err) => {
        // 404 means not created yet — that's fine
        if (!err.message?.includes("404") && err.status !== 404) {
          setError(err.message || "Failed to load booking page.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addService() {
    setForm((f) => ({ ...f, services: [...f.services, { ...EMPTY_SERVICE }] }));
  }

  function updateService(index, field, value) {
    setForm((f) => {
      const services = [...f.services];
      services[index] = { ...services[index], [field]: value };
      return { ...f, services };
    });
  }

  function removeService(index) {
    setForm((f) => ({
      ...f,
      services: f.services.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const payload = {
        business_name: form.business_name,
        tagline: form.tagline || undefined,
        whatsapp_number: form.whatsapp_number || undefined,
        notification_email: form.notification_email || undefined,
        mode: form.mode,
        active: form.active,
        services: form.services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            duration_min: s.duration_min ? Number(s.duration_min) : undefined,
            price: s.price || undefined,
          })),
      };

      if (existing) {
        await api.updateBookingPage(payload);
      } else {
        await api.createBookingPage({ ...payload, slug: form.slug });
        const fresh = await api.getOwnBookingPage();
        setExisting(fresh);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to save booking page.");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = existing
    ? `${window.location.origin}/b/${existing.slug}`
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Booking Page</h1>
          <p className="subtitle">{tenant.name}</p>
        </div>
        <div className="header-actions">
          {publicUrl && (
            <a
              className="secondary"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View public page &#8599;
            </a>
          )}
          <button className="secondary" onClick={() => navigate("/")}>
            &#8592; Automations
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bs-loading">
          <div className="skeleton bs-skeleton--line" />
          <div className="skeleton bs-skeleton--line" style={{ width: "60%" }} />
        </div>
      ) : (
        <form className="bs-form" onSubmit={handleSubmit} noValidate>
          {/* Slug — only editable on creation */}
          <div className="bs-section">
            <h2 className="bs-section-title">Page URL</h2>
            <div className="bs-field">
              <label className="bs-label">Slug</label>
              {existing ? (
                <div className="bs-slug-locked">
                  <code>{existing.slug}</code>
                  <span className="bs-slug-hint">Slug cannot be changed after creation.</span>
                </div>
              ) : (
                <div className="bs-slug-input-wrap">
                  <span className="bs-slug-prefix">/b/</span>
                  <input
                    className="bs-input"
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="your-business"
                    required
                    pattern="[a-z0-9][a-z0-9\-]{1,98}[a-z0-9]"
                    title="Lowercase letters, numbers and hyphens. Min 3 chars."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Business info */}
          <div className="bs-section">
            <h2 className="bs-section-title">Business Info</h2>
            <div className="bs-grid">
              <div className="bs-field">
                <label className="bs-label">Business name <span className="bs-req">*</span></label>
                <input
                  className="bs-input"
                  type="text"
                  value={form.business_name}
                  onChange={(e) => set("business_name", e.target.value)}
                  required
                />
              </div>
              <div className="bs-field">
                <label className="bs-label">Tagline</label>
                <input
                  className="bs-input"
                  type="text"
                  value={form.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="e.g. Book your appointment online"
                />
              </div>
              <div className="bs-field">
                <label className="bs-label">WhatsApp number</label>
                <input
                  className="bs-input"
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={(e) => set("whatsapp_number", e.target.value)}
                  placeholder="+971501234567"
                />
              </div>
              <div className="bs-field">
                <label className="bs-label">Notification email</label>
                <input
                  className="bs-input"
                  type="email"
                  value={form.notification_email}
                  onChange={(e) => set("notification_email", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>
          </div>

          {/* Mode */}
          <div className="bs-section">
            <h2 className="bs-section-title">Page Mode</h2>
            <div className="bs-mode-group">
              {MODES.map((m) => (
                <label key={m.value} className={`bs-mode-option ${form.mode === m.value ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="mode"
                    value={m.value}
                    checked={form.mode === m.value}
                    onChange={() => set("mode", m.value)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="bs-section">
            <div className="bs-section-header">
              <h2 className="bs-section-title">Services</h2>
              <button type="button" className="bs-add-btn" onClick={addService}>
                + Add service
              </button>
            </div>
            {form.services.length === 0 ? (
              <p className="bs-empty-hint">No services added. Customers will see a free-text form.</p>
            ) : (
              <div className="bs-services-list">
                <div className="bs-service-header">
                  <span>Name</span>
                  <span>Duration (min)</span>
                  <span>Price</span>
                  <span />
                </div>
                {form.services.map((svc, i) => (
                  <ServiceRow
                    key={i}
                    svc={svc}
                    index={i}
                    onChange={updateService}
                    onRemove={removeService}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="bs-section bs-section--inline">
            <h2 className="bs-section-title">Page status</h2>
            <label className="bs-toggle">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
              />
              <span className="bs-toggle-track" />
              <span className="bs-toggle-label">{form.active ? "Active" : "Inactive"}</span>
            </label>
          </div>

          {error && <p className="bs-error">{error}</p>}
          {saved && <p className="bs-saved">&#10003; Saved successfully</p>}

          <div className="bs-actions">
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : existing ? "Save changes" : "Create booking page"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
