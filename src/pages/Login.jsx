import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "./Login.css";

const UNVERIFIED_PHRASES = [
  "verify your email",
  "email_not_verified",
  "verification",
];

function isUnverifiedError(err) {
  if (err.status === 403) return true;
  const msg = (err.message || "").toLowerCase();
  return UNVERIFIED_PHRASES.some((p) => msg.includes(p));
}

export default function Login({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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
      if (isUnverifiedError(err)) {
        setVerifyPending(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMsg("");
    try {
      await api.resendVerification(email, password);
      setResendMsg("Verification email sent. Check your inbox.");
    } catch (err) {
      setResendMsg(err.message || "Could not resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

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
              {resendMsg && (
                <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--color-text-muted, #666)" }}>
                  {resendMsg}
                </p>
              )}
              <button
                className="primary login-btn"
                onClick={handleResend}
                disabled={resendLoading}
                style={{ marginTop: "16px" }}
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </button>
              <button
                className="primary login-btn"
                style={{ marginTop: "10px", background: "transparent", color: "var(--color-primary, #01696f)", border: "1px solid currentColor" }}
                onClick={() => {
                  setVerifyPending(false);
                  setIsRegister(false);
                  setPassword("");
                  setResendMsg("");
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
                <span onClick={() => { setIsRegister(!isRegister); setError(""); setShowPassword(false); }}>
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
