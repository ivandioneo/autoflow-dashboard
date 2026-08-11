import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import "./BookingPage.css";

const EMPTY_FORM = {
  submission_type: "booking",
  service_name: "",
  preferred_datetime: "",
  customer_name: "",
  phone: "",
  email: "",
  notes: "",
};

export default function BookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    api.getBookingPage(slug)
      .then((data) => {
        setPage(data);
        // Pre-select the first service if only one exists
        if (data.services && data.services.length === 1) {
          setForm((prev) => ({ ...prev, service_name: data.services[0].name }));
        }
      })
      .catch(() => setError("This booking page could not be found."))
      .finally(() => setLoading(false));
  }, [slug]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        submission_type: form.submission_type,
        service_name: form.service_name,
        preferred_datetime: form.preferred_datetime,
        customer_name: form.customer_name,
        phone: form.phone,
        ...(form.email ? { email: form.email } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      };
      await api.submitBooking(slug, payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="bp-shell">
        <div className="bp-card">
          <div className="bp-skeleton bp-skeleton-title" />
          <div className="bp-skeleton bp-skeleton-text" />
          <div className="bp-skeleton bp-skeleton-text bp-skeleton-short" />
          <div className="bp-skeleton bp-skeleton-field" />
          <div className="bp-skeleton bp-skeleton-field" />
          <div className="bp-skeleton bp-skeleton-field" />
          <div className="bp-skeleton bp-skeleton-btn" />
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="bp-shell">
        <div className="bp-card bp-card-error">
          <div className="bp-error-icon">✕</div>
          <h2>Page not found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /* ── Success ──────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="bp-shell">
        <div className="bp-card bp-card-success">
          <div className="bp-success-icon">✓</div>
          <h2>Request received!</h2>
          <p>Thanks for reaching out. We&apos;ll be in touch shortly.</p>
        </div>
      </div>
    );
  }

  const hasServices = page.services && page.services.length > 0;

  /* ── Form ─────────────────────────────────────────────────────────── */
  return (
    <div className="bp-shell">
      <div className="bp-card">
        {page.logo_url && (
          <img src={page.logo_url} alt={page.business_name} className="bp-logo" />
        )}
        <h1 className="bp-title">{page.business_name}</h1>
        {page.description && <p className="bp-description">{page.description}</p>}

        <form className="bp-form" onSubmit={handleSubmit} noValidate>

          {/* Submission type toggle */}
          <div className="bp-field bp-field-toggle">
            <label>Request type</label>
            <div className="bp-toggle">
              <button
                type="button"
                className={`bp-toggle-btn${form.submission_type === "booking" ? " active" : ""}`}
                onClick={() => setForm((p) => ({ ...p, submission_type: "booking" }))}
              >
                Book appointment
              </button>
              <button
                type="button"
                className={`bp-toggle-btn${form.submission_type === "quote" ? " active" : ""}`}
                onClick={() => setForm((p) => ({ ...p, submission_type: "quote" }))}
              >
                Get a quote
              </button>
            </div>
          </div>

          {/* Service */}
          {hasServices ? (
            <div className="bp-field">
              <label htmlFor="bp-service">Service</label>
              <select
                id="bp-service"
                name="service_name"
                value={form.service_name}
                onChange={handleChange}
                required
              >
                <option value="">Select a service…</option>
                {page.services.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                    {s.duration_minutes ? ` (${s.duration_minutes} min)` : ""}
                    {s.price_hint ? ` — ${s.price_hint}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bp-field">
              <label htmlFor="bp-service">Service / job description</label>
              <input
                id="bp-service"
                name="service_name"
                type="text"
                value={form.service_name}
                onChange={handleChange}
                required
                placeholder="e.g. Haircut, Consultation…"
              />
            </div>
          )}

          {/* Preferred date/time */}
          <div className="bp-field">
            <label htmlFor="bp-datetime">Preferred date &amp; time</label>
            <input
              id="bp-datetime"
              name="preferred_datetime"
              type="datetime-local"
              value={form.preferred_datetime}
              onChange={handleChange}
              required
            />
          </div>

          {/* Customer name */}
          <div className="bp-field">
            <label htmlFor="bp-name">Full name</label>
            <input
              id="bp-name"
              name="customer_name"
              type="text"
              value={form.customer_name}
              onChange={handleChange}
              required
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          {/* Phone — required */}
          <div className="bp-field">
            <label htmlFor="bp-phone">Phone / WhatsApp</label>
            <input
              id="bp-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              placeholder="+1 555 000 0000"
              autoComplete="tel"
            />
          </div>

          {/* Email — optional */}
          <div className="bp-field">
            <label htmlFor="bp-email">
              Email <span className="bp-optional">(optional)</span>
            </label>
            <input
              id="bp-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>

          {/* Notes — optional */}
          <div className="bp-field">
            <label htmlFor="bp-notes">
              Notes <span className="bp-optional">(optional)</span>
            </label>
            <textarea
              id="bp-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any details or special requests…"
            />
          </div>

          {submitError && <p className="bp-submit-error">{submitError}</p>}

          <button className="bp-submit" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>

        <p className="bp-powered">Powered by <strong>AutoFlow</strong></p>
      </div>
    </div>
  );
}
