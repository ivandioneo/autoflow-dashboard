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
      onAuth(result.tenant, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>AutoFlow</h1>
          <p>{isRegister ? "Create your account" : "Sign in to your dashboard"}</p>
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
  );
}
