"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import { checkAdminSession } from "./adminApi";
import "./admin.css";

type GateState = "checking" | "login" | "dashboard";
const LOGIN_MARKER = "portfolio-admin-session-active";

function hasLoginMarker(): boolean {
  try {
    return window.sessionStorage.getItem(LOGIN_MARKER) === "true";
  } catch {
    return false;
  }
}

function setLoginMarker(active: boolean): void {
  try {
    if (active) window.sessionStorage.setItem(LOGIN_MARKER, "true");
    else window.sessionStorage.removeItem(LOGIN_MARKER);
  } catch {
    // Session state is an optional UX guard; the server session still controls access.
  }
}

export function AdminApp() {
  const [gate, setGate] = useState<GateState>("checking");
  const [configured, setConfigured] = useState(true);
  const [authDisabled, setAuthDisabled] = useState(false);
  const [error, setError] = useState("");
  const handleSignedOut = useCallback(() => {
    setLoginMarker(false);
    setGate("login");
  }, []);
  const handleUnauthorized = useCallback(() => {
    setLoginMarker(false);
    setGate("login");
  }, []);
  const handleLoginSuccess = useCallback(async () => {
    const session = await checkAdminSession();
    if (session.authenticated !== "true") {
      throw new Error("Sign-in was accepted, but the admin session could not be verified. Check that cookies are enabled and try again.");
    }
    setLoginMarker(true);
    setConfigured(session.configured === "true");
    setAuthDisabled(session.authDisabled === "true");
    setGate("dashboard");
  }, []);

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
        if (hasLoginMarker() && session.authenticated === "true") {
          setLoginMarker(true);
          setGate("dashboard");
        } else {
          setLoginMarker(false);
          setGate("login");
        }
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
        onSuccess={handleLoginSuccess}
      />
    );
  }

  return <AdminDashboard authDisabled={authDisabled} onSignedOut={handleSignedOut} onUnauthorized={handleUnauthorized} />;
}
