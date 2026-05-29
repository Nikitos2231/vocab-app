import { useState } from "react";
import { login } from "./auth";

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.glow} />
      <form onSubmit={handleSubmit} style={styles.form} className="fade-in">
        <div style={styles.logoWrap}>
          <div style={styles.logo}>V</div>
        </div>
        <h1 style={styles.title}>Vocab</h1>
        <p style={styles.subtitle}>Войдите, чтобы продолжить</p>

        <div style={styles.fields}>
          <div style={styles.field}>
            <label style={styles.label}>Логин</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="username" autoComplete="username" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password" required />
          </div>
        </div>

        <div style={styles.errorSlot}>
          {error && <p style={styles.error}>⚠ {error}</p>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={styles.submitBtn}>
          {loading
            ? <><span style={styles.spinner} /> Вход…</>
            : "Войти →"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)", padding: 16,
    position: "relative", overflow: "hidden",
  },
  glow: {
    position: "absolute", top: "20%", left: "50%",
    transform: "translateX(-50%)",
    width: 400, height: 400,
    background: "radial-gradient(circle, rgba(108,127,255,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  form: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "36px 32px",
    width: "100%", maxWidth: 360,
    display: "flex", flexDirection: "column", gap: 12,
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    position: "relative",
  },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: 4 },
  logo: {
    width: 48, height: 48, borderRadius: 14,
    background: "linear-gradient(135deg, #6c7fff, #a29bfe)",
    color: "#fff", fontSize: 22, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(108,127,255,0.4)",
    animation: "pulse-glow 3s ease infinite",
  },
  title: { fontSize: 24, fontWeight: 800, color: "var(--text)", textAlign: "center" },
  subtitle: { fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 4 },
  fields: { display: "flex", flexDirection: "column", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 12, color: "var(--text-muted)", fontWeight: 500 },
  errorSlot: { minHeight: 22 },
  error: { color: "var(--danger)", fontSize: 13, textAlign: "center" },
  submitBtn: { width: "100%", height: 42, fontSize: 15, marginTop: 4, letterSpacing: "0.02em" },
  spinner: {
    width: 14, height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
};
