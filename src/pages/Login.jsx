import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./Login.css";

export default function Login({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResendSent(false);
    setLoading(true);

    try {
      let result;
      if (isRegister) {
        if (!name.trim()) {
          setError("Business name is required");
          setLoading(false);
          return;
        }
        await api.register(name, email, password);
        setVerifyPending(true);
        return;
      } else {
        result = await api.login(email, password);
      }
      onAuth(result.tenant);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.resendVerification(email, password);
      setResendSent(true);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  const showResend =
    !isRegister &&
    error &&
    error.toLowerCase().includes("verify") &&
    !resendSent;

  return (
    <div className="login-page">
      {/* Brand panel — collapses to a slim header on mobile */}
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
            Reminders, follow-ups, and confirmations that run on their own — so
            you can focus on the work that matters.
          </p>
          <div className="login-brand-points">
            <span>✦ Automated appointment reminders</span>
            <span>✦ Every account fully isolated</span>
            <span>✦ Built for UAE businesses</span>
          </div>
        </div>
      </div>
      <div className="login-form-panel">
        <div className="login-card">
          {verifyPending ? (
            <div className="verify-pending">
              <div className="verify-pending-icon">✉</div>
              <h2>Check your inbox</h2>
              <p>
                We sent a verification link to <strong>{email}</strong>.<br />
                Verify your email before signing in.
              </p>
              <button
                className="primary login-btn"
                onClick={() => {
                  setVerifyPending(false);
                  setIsRegister(false);
                  setPassword("");
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="login-header">
                <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
                <p>
                  {isRegister
                    ? "Set up your AutoFlow dashboard"
                    : "Sign in to your dashboard"}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="login-form">
                {isRegister && (
                  <div className="field">
                    <label>Business name</label>
                    <input type="text" placeholder="Glow Salon" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label>Email</label>
                  <input type="email" placeholder="you@yourbusiness.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Password</label>
                  <div className="field-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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
                {error && <div className="error-msg">{error}</div>}
                {showResend && (
                  <button
                    type="button"
                    className="ghost resend-btn"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
                {resendSent && (
                  <div className="success-msg">
                    Verification email sent — check your inbox.
                  </div>
                )}
                <button type="submit" className="primary login-btn" disabled={loading}>
                  {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
                </button>
              </form>
              {!isRegister && (
                <p className="toggle-auth" style={{ marginTop: "8px" }}>
                  <Link to="/forgot-password" style={{ fontSize: "13px" }}>Forgot password?</Link>
                </p>
              )}
              <p className="toggle-auth">
                {isRegister ? "Already have an account?" : "No account?"}{" "}
                <span onClick={() => { setIsRegister(!isRegister); setError(""); setResendSent(false); setShowPassword(false); }}>
                  {isRegister ? "Sign in" : "Create one"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
