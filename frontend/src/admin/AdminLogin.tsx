import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { adminLogin } from "./adminApi";

type AdminLoginProps = {
  onSuccess: () => void;
  configured: boolean;
};

export function AdminLogin({ onSuccess, configured }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await adminLogin(username, password);
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="cms-login-page">
      <a className="cms-back-link" href="/">
        <ArrowLeft size={15} /> Back to portfolio
      </a>
      <section className="cms-login-card">
        <span className="cms-login-icon">
          <LockKeyhole size={22} />
        </span>
        <span className="cms-overline">PORTFOLIO CMS</span>
        <h1>Admin Portal Access</h1>
        <p>Sign in to manage your portfolio.</p>
        {!configured && (
          <p className="cms-config-note" role="alert">
            Admin access is not configured. Set <code>ADMIN_USERNAME</code> and{" "}
            <code>ADMIN_PASSWORD</code> in{" "}
            <code>backend/.env</code>.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label className="cms-field">
            Username
            <input
              autoComplete="username"
              autoFocus
              disabled={!configured || busy}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
              value={username}
            />
          </label>
          <label className="cms-field">
            Password
            <input
              autoComplete="current-password"
              disabled={!configured || busy}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="cms-error" role="alert">{error}</p>}
          <button className="cms-primary-btn" disabled={!configured || busy} type="submit">
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
