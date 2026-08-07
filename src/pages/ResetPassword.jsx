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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-wordmark">AutoFlow</div>
          <h1 className="login-title">Invalid link</h1>
          <p className="login-sub">This password reset link is missing or malformed.</p>
          <button className="login-btn" style={{ marginTop: "24px" }} onClick={() => navigate("/login")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-wordmark">AutoFlow</div>
          <h1 className="login-title">Password updated</h1>
          <p className="login-sub">Your new password has been saved. Please sign in to continue.</p>
          <button className="login-btn" style={{ marginTop: "24px" }} onClick={() => navigate("/login")}>
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    api
      .resetPassword(token, password)
      .then(function () {
        setDone(true);
      })
      .catch(function (err) {
        setError(err.message);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-wordmark">AutoFlow</div>
        <h1 className="login-title">Set new password</h1>
        <p className="login-sub">Choose a strong password for your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="rp-password" className="login-label">New password</label>
            <input
              id="rp-password"
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              minLength={8}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="login-field">
            <label htmlFor="rp-confirm" className="login-label">Confirm password</label>
            <input
              id="rp-confirm"
              type="password"
              className="login-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat your new password"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
