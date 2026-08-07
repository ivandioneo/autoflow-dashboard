import { useState } from "react";
import { api } from "../api";
import "./Login.css";

export default function Login({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Set when registration succeeds — holds the submitted email/password
  // so the resend-verification flow can re-use them without asking again.
  const [verificationPending, setVerificationPending] = useState(null);
  const [resendStatus, setResendStatus] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Business name is required");
          setLoading(false);
          return;
        }
        // Registration returns {message, status} — no tenant/token.
        await api.register(name, email, password);
        // Show the verification-pending notice; do NOT call onAuth().
        setVerificationPending({ email, password });
        return;
      }

      const result = await api.login(email, password);
      onAuth(result.tenant);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!verificationPending) return;
    setResendStatus("");
    setResendLoading(true);
    try {
      const result = await api.resendVerification(
        verificationPending.email,
        verificationPending.password
      );
      setResendStatus(result.message || "Verification email sent.");
    } catch (err) {
      setResendStatus(err.message || "Could not resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  // Verification-pending screen shown after successful registration.
  if (verificationPending) {
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
            <div className="login-header">
              <h1>Check your email</h1>
              <p>One step left before you can sign in.</p>
            </div>
            <div className="verify-notice">
              <p>
                We sent a verification link to{" "}
                <strong>{verificationPending.email}</strong>. Click the link in
                that email to activate your account, then come back here to sign
                in.
              </p>
              <p className="verify-notice-sub">
                Didn’t receive it? Check your spam folder or resend below.
              </p>
            </div>
            {resendStatus && (
              <div className="info-msg">{resendStatus}</div>
            )}
            <button
              className="primary login-btn"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? "Sending..." : "Resend verification email"}
            </button>
            <p className="toggle-auth">
              Already verified?{" "}
              <span
                onClick={() => {
                  setVerificationPending(null);
                  setIsRegister(false);
                  setResendStatus("");
                  setEmail(verificationPending.email);
                  setPassword("");
                }}
              >
                Sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    );
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
              <input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="primary login-btn" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="toggle-auth">
            {isRegister ? "Already have an account?" : "No account?"}{" "}
            <span onClick={() => { setIsRegister(!isRegister); setError(""); }}>
              {isRegister ? "Sign in" : "Create one"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
