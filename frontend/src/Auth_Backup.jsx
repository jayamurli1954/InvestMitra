import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Simple local-only Auth page.
 * - Avoids Google OAuth / service-worker interactions.
 * - Sends credentials to backend local-login endpoint:
 *     POST http://127.0.0.1:8000/api/auth/local-login
 * - On success stores token in localStorage and navigates to "/".
 *
 * Drop this file into: frontend/src/pages/Auth.jsx
 */

const API = "http://127.0.0.1:8000/api";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true); // toggle for register vs login (UI only)
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // local-login endpoint expects { username } in original demo,
      // but we send { email, password } — adapt if your backend expects different keys.
      const url = `${API}/${isLogin ? "auth/local-login" : "auth/register"}`;

      const payload =
        isLogin
          ? { email: formData.email, password: formData.password } // backend sample accepts username
          : { email: formData.email, password: formData.password, name: formData.name };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // backend sends errors in .detail or .message in some handlers
        const msg = data.detail || data.message || JSON.stringify(data);
        alert("Login failed: " + msg);
        setLoading(false);
        return;
      }

      // Example backend response in this project: { message: "Welcome, Murli! (local mode)", token: "fake-token" }
      const token = data.token || data.access_token || null;
      if (token) {
        localStorage.setItem("token", token);
		// Trigger auth check to update context
        window.location.reload();
      }

      alert(data.message || "Authentication successful");

      // navigate to main page
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Auth error:", err);
      alert("Network or server error. See console for details.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome Back</h1>

        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              // Use local login button (replaces Google OAuth)
              setIsLogin(true);
            }}
            style={styles.googleButton}
            disabled={loading}
          >
            <span style={{ marginRight: 8 }}>🔒</span> Continue with Local Login
          </button>
        </div>

        <hr style={styles.hr} />

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Your name"
                disabled={loading}
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              placeholder="password"
              disabled={loading}
            />
          </div>

          <button type="submit" style={styles.submit} disabled={loading}>
            {loading ? (isLogin ? "Signing in..." : "Registering...") : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setIsLogin((s) => !s)}
            style={styles.link}
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 10% 10%, #0f1724, #071026)",
    padding: 20,
  },
  card: {
    width: 520,
    padding: 32,
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
    color: "#e6eef8",
  },
  title: { margin: 0, marginBottom: 18, textAlign: "center" },
  googleButton: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    color: "#e6eef8",
    cursor: "pointer",
  },
  hr: { border: "none", height: 1, background: "rgba(255,255,255,0.03)", margin: "18px 0" },
  field: { marginBottom: 12 },
  label: { display: "block", marginBottom: 6, color: "#a9b6c8", fontSize: 14 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.04)",
    background: "rgba(255,255,255,0.01)",
    color: "#e6eef8",
  },
  submit: {
    width: "100%",
    padding: "12px 16px",
    marginTop: 8,
    borderRadius: 8,
    border: "none",
    background: "#10b981",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  link: {
    background: "none",
    border: "none",
    color: "#9fb3c8",
    cursor: "pointer",
    textDecoration: "underline",
  },
};

export default Auth;
