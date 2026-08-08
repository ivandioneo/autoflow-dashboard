import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Login.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-form-panel">
          <div className="login-card">
            <div className="verify-pending">
              <div className="verify-pending-icon" style={{ color: "var(--color-error, #a12c7b)" }}>✕</div>
              <h2>Invalid link</h2>
              <p>This reset link is missing or malformed. Please request a new one.</p>
              <button className="primary login-btn" onClick={() => navigate("/forgot-password")}>
                Request new link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
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
          {done ? (
            <div className="verify-pending">
              <div className="verify-pending-icon">✓</div>
              <h2>Password updated</h2>
              <p>Your new password is set. Sign in to continue.</p>
              <button className="primary login-btn" style={{ marginTop: "20px" }} onClick={() => navigate("/login")}>
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="login-header">
                <h1>Set new password</h1>
                <p>Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                <div className="field">
                  <label>New password</label>
                  <div className="field-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Confirm password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="primary login-btn" disabled={loading}>
                  {loading ? "Saving…" : "Set new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
