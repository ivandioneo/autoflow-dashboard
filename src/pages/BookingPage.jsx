import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import "./BookingPage.css";

export default function BookingPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    api.getBookingPage(slug)
      .then(setPage)
      .catch(() => setError("This booking page could not be found."))
      .finally(() => setLoading(false));
  }, [slug]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitBooking(slug, form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (submitted) {
    return (
      <div className="bp-shell">
        <div className="bp-card bp-card-success">
          <div className="bp-success-icon">✓</div>
          <h2>Request received!</h2>
          <p>{page.confirmation_message || "Thanks for reaching out. We'll be in touch shortly."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bp-shell">
      <div className="bp-card">
        {page.logo_url && (
          <img src={page.logo_url} alt={page.business_name} className="bp-logo" />
        )}
        <h1 className="bp-title">{page.title || page.business_name}</h1>
        {page.description && <p className="bp-description">{page.description}</p>}

        <form className="bp-form" onSubmit={handleSubmit} noValidate>
          <div className="bp-field">
            <label htmlFor="bp-name">Full name</label>
            <input
              id="bp-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          <div className="bp-field">
            <label htmlFor="bp-email">Email address</label>
            <input
              id="bp-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>

          <div className="bp-field">
            <label htmlFor="bp-phone">Phone <span className="bp-optional">(optional)</span></label>
            <input
              id="bp-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 555 000 0000"
              autoComplete="tel"
            />
          </div>

          <div className="bp-field">
            <label htmlFor="bp-message">{page.message_label || "Message"}</label>
            <textarea
              id="bp-message"
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={4}
              placeholder={page.message_placeholder || "Tell us what you need…"}
            />
          </div>

          {submitError && <p className="bp-submit-error">{submitError}</p>}

          <button className="bp-submit" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : (page.cta_label || "Send request")}
          </button>
        </form>

        <p className="bp-powered">Powered by <strong>AutoFlow</strong></p>
      </div>
    </div>
  );
}
