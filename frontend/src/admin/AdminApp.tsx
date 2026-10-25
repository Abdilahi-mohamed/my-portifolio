import { useEffect, useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import { checkAdminSession } from "./adminApi";
import "./admin.css";

type GateState = "checking" | "login" | "dashboard";

export function AdminApp() {
  const [gate, setGate] = useState<GateState>("checking");
  const [configured, setConfigured] = useState(true);
  const [authDisabled, setAuthDisabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Portfolio CMS";
    const robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkAdminSession()
      .then((session) => {
        if (controller.signal.aborted) return;
        setConfigured(session.configured === "true");
        setAuthDisabled(session.authDisabled === "true");
        setGate(session.authenticated === "true" ? "dashboard" : "login");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not connect to the API.");
        setGate("login");
      });
    return () => controller.abort();
  }, []);

  if (gate === "checking") {
    return <main className="cms-loading">Loading admin workspace...</main>;
  }

  if (error && gate === "login") {
    return (
      <main className="cms-loading">
        <div className="cms-load-error">
          <strong>Connection issue</strong>
          <span>{error}</span>
          <a className="cms-primary-btn cms-inline-link" href="/">Back to portfolio</a>
        </div>
      </main>
    );
  }

  if (gate === "login") {
    return (
      <AdminLogin
        configured={configured}
        onSuccess={() => setGate("dashboard")}
      />
    );
  }

  return (
    <AdminDashboard
      authDisabled={authDisabled}
      onSignedOut={() => setGate("login")}
      onUnauthorized={() => setGate("login")}
    />
  );
}
