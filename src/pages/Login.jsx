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
        result = await api.register(name, email, password);
      } else {
        result = await api.login(email, password);
      }
      onAuth(result.tenant, result.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

      {/* Form panel */}
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
                <input
                  type="text"
                  placeholder="Glow Salon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

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

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="primary login-btn" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="toggle-auth">
            {isRegister ? "Already have an account?" : "No account?"}{" "}
            <span
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "Sign in" : "Create one"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
