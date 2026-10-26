import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { adminLogin } from "./adminApi";

type AdminLoginProps = {
  onSuccess: () => void;
  configured: boolean;
};

export function AdminLogin({ onSuccess, configured }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <section className="cms-login-card">
        <span className="cms-login-icon"><ShieldCheck size={34} strokeWidth={2.5} /></span>
        <h1>OPEN ADMIN PAGE</h1>
        <p className="cms-login-intro">Welcome back! Please enter your credentials</p>
        {!configured && (
          <p className="cms-config-note" role="alert">
            Admin access is not configured. Set <code>ADMIN_USERNAME</code> and{" "}
            <code>ADMIN_PASSWORD</code> in{" "}
            <code>backend/.env</code>.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label className="cms-field">
            <span>USERNAME</span>
            <span className="cms-login-input">
              <UserRound aria-hidden="true" size={22} />
              <input
                autoComplete="username"
                autoFocus
                disabled={!configured || busy}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                required
                value={username}
              />
            </span>
          </label>
          <label className="cms-field">
            <span>PASSWORD</span>
            <span className="cms-login-input">
              <KeyRound aria-hidden="true" size={21} />
              <input
                autoComplete="current-password"
                disabled={!configured || busy}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="cms-login-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>
          {error && <p className="cms-error" role="alert">{error}</p>}
          <button className="cms-login-submit" disabled={!configured || busy} type="submit">
            {busy ? "SIGNING IN..." : <>SIGN IN <ArrowRight size={19} strokeWidth={2.5} /></>}
          </button>
        </form>
        <a className="cms-login-back" href="/">Back to portfolio</a>
      </section>
    </main>
  );
}
