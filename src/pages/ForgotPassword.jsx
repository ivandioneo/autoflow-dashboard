import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-orb login-brand-orb-1" />
        <div className="login-brand-orb login-brand-orb-2" />
        <div className="login-brand-inner">
          <div className="login-logo">
            <div className="login-logo-mark">A</div>
            <span className="login-logo-word">AutoFlow</span>
          </div>
          <h2 className="login-brand-headline">
            Your business on <span className="login-accent">autopilot.</span>
          </h2>
          <p className="login-brand-sub">
            Reminders, follow-ups, and confirmations that run on their own.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          {submitted ? (
            <div className="verify-pending">
              <div className="verify-pending-icon">✉</div>
              <h2>Check your inbox</h2>
              <p>
                If <strong>{email}</strong> is registered, a password reset link
                is on its way. It expires in&nbsp;1&nbsp;hour.
              </p>
              <Link to="/login" className="primary login-btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "20px" }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="login-header">
                <h1>Forgot password</h1>
                <p>Enter your email and we&apos;ll send a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="primary login-btn" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="toggle-auth">
                Remember it?{" "}
                <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
