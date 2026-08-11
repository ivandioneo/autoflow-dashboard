/**
 * Public customer-facing booking/quote form.
 * Rendered at /b/:slug — no authentication required.
 * Fetches page config from GET /b/{slug} then POSTs to /b/{slug}/submit.
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import "./BookingPage.css";

function FieldGroup({ label, required, children }) {
  return (
    <div className="bp-field">
      <label className="bp-label">
        {label}{required && <span className="bp-required">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ mode }) {
  if (mode === "booking") return <span className="bp-mode-badge">Booking</span>;
  if (mode === "quote") return <span className="bp-mode-badge bp-mode-badge--quote">Quote Request</span>;
  return null;
}

export default function BookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    submission_type: "booking",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    service_requested: "",
    preferred_date: "",
    preferred_time: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getBookingPage(slug)
      .then((data) => {
        setPage(data);
        if (data.mode !== "both") {
          setForm((f) => ({ ...f, submission_type: data.mode }));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        customer_email: form.customer_email || undefined,
        service_requested: form.service_requested || undefined,
        preferred_date: form.preferred_date || undefined,
        preferred_time: form.preferred_time || undefined,
        message: form.message || undefined,
      };
      await api.submitBooking(slug, payload);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bp-shell">
        <div className="bp-card">
          <div className="bp-skeleton bp-skeleton--title" />
          <div className="bp-skeleton bp-skeleton--line" />
          <div className="bp-skeleton bp-skeleton--line" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bp-shell">
        <div className="bp-card bp-card--center">
          <span className="bp-empty-icon">&#128683;</span>
          <h2>Page not found</h2>
          <p>This booking page doesn&apos;t exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bp-shell">
        <div className="bp-card bp-card--center">
          <span className="bp-success-icon">&#10003;</span>
          <h2>Request received!</h2>
          <p>
            Thanks, <strong>{form.customer_name}</strong>. We&apos;ll be in touch
            at <strong>{form.customer_phone}</strong> soon.
          </p>
        </div>
      </div>
    );
  }

  const showTypeToggle = page.mode === "both";

  return (
    <div className="bp-shell">
      <div className="bp-card">
        <div className="bp-header">
          <h1 className="bp-business-name">{page.business_name}</h1>
          {page.tagline && <p className="bp-tagline">{page.tagline}</p>}
          {!showTypeToggle && <StatusBadge mode={page.mode} />}
        </div>

        <form className="bp-form" onSubmit={handleSubmit} noValidate>
          {showTypeToggle && (
            <div className="bp-toggle-group">
              <button
                type="button"
                className={`bp-toggle-btn ${form.submission_type === "booking" ? "active" : ""}`}
                onClick={() => set("submission_type", "booking")}
              >
                Book Appointment
              </button>
              <button
                type="button"
                className={`bp-toggle-btn ${form.submission_type === "quote" ? "active" : ""}`}
                onClick={() => set("submission_type", "quote")}
              >
                Request Quote
              </button>
            </div>
          )}

          <FieldGroup label="Your name" required>
            <input
              className="bp-input"
              type="text"
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </FieldGroup>

          <FieldGroup label="Phone number" required>
            <input
              className="bp-input"
              type="tel"
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="+971 50 123 4567"
              required
            />
          </FieldGroup>

          <FieldGroup label="Email (optional)">
            <input
              className="bp-input"
              type="email"
              value={form.customer_email}
              onChange={(e) => set("customer_email", e.target.value)}
              placeholder="jane@example.com"
            />
          </FieldGroup>

          {page.services && page.services.length > 0 && (
            <FieldGroup label="Service">
              <select
                className="bp-input"
                value={form.service_requested}
                onChange={(e) => set("service_requested", e.target.value)}
              >
                <option value="">Select a service…</option>
                {page.services.map((s, i) => (
                  <option key={i} value={s.name}>
                    {s.name}
                    {s.price ? ` — ${s.price}` : ""}
                    {s.duration_min ? ` (${s.duration_min} min)` : ""}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}

          {form.submission_type === "booking" && (
            <div className="bp-row">
              <FieldGroup label="Preferred date">
                <input
                  className="bp-input"
                  type="date"
                  value={form.preferred_date}
                  onChange={(e) => set("preferred_date", e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Preferred time">
                <input
                  className="bp-input"
                  type="time"
                  value={form.preferred_time}
                  onChange={(e) => set("preferred_time", e.target.value)}
                />
              </FieldGroup>
            </div>
          )}

          <FieldGroup label={form.submission_type === "quote" ? "Details / scope" : "Message (optional)"}>
            <textarea
              className="bp-input bp-textarea"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              placeholder={form.submission_type === "quote" ? "Describe what you need…" : "Any requests or notes…"}
              rows={3}
            />
          </FieldGroup>

          {error && <p className="bp-error">{error}</p>}

          <button
            className="bp-submit"
            type="submit"
            disabled={submitting || !form.customer_name || !form.customer_phone}
          >
            {submitting
              ? "Sending…"
              : form.submission_type === "quote"
              ? "Request Quote"
              : "Book Now"}
          </button>
        </form>
      </div>
    </div>
  );
}
