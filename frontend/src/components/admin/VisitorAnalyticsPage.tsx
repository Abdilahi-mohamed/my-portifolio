"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Eye, LogOut } from "lucide-react";
import { adminLogout, loadAdminVisitorAnalytics, type AdminVisitorAnalytics } from "./adminApi";

export function VisitorAnalyticsPage({
  authDisabled,
  onSignedOut,
  onUnauthorized,
}: {
  authDisabled: boolean;
  onSignedOut: () => void;
  onUnauthorized: () => void;
}) {
  const [analytics, setAnalytics] = useState<AdminVisitorAnalytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAnalytics(await loadAdminVisitorAnalytics());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load visitor analytics.";
      setError(message);
      if (message.toLowerCase().includes("sign in")) onUnauthorized();
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    document.title = "Visitor Analytics — Portfolio CMS";
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = async () => {
    try {
      await adminLogout();
      onSignedOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
    }
  };

  return (
    <div className="cms-app">
      <header className="cms-global-nav">
        <a className="cms-brand" href="/admin" aria-label="Portfolio CMS dashboard">
          <span className="cms-brand-mark"><Eye size={17} /></span>
          <span><strong>Portfolio CMS</strong><small>VISITOR ANALYTICS</small></span>
        </a>
        <div className="cms-global-actions">
          <a className="cms-top-site-link" href="/"><ExternalLink size={15} /> View portfolio</a>
          {!authDisabled && <button aria-label="Sign out" className="cms-icon-button" onClick={() => { void signOut(); }} title="Sign out" type="button"><LogOut size={16} /></button>}
        </div>
      </header>

      <main className="cms-analytics-page">
        <a className="cms-analytics-back" href="/admin"><ArrowLeft size={15} /> Back to dashboard</a>
        <section aria-labelledby="visitor-analytics-title" className="cms-panel cms-analytics-panel">
          <div className="cms-panel-heading">
            <div>
              <span className="cms-section-index">PORTFOLIO TRAFFIC</span>
              <h1 id="visitor-analytics-title">Visitor analytics</h1>
              <p>Anonymous browser sessions only. Names, emails, and IP addresses are not collected.</p>
            </div>
            <button className="cms-outline-btn" disabled={loading} onClick={() => { void refresh(); }} type="button">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {error
            ? <div className="cms-analytics-message" role="alert">{error}<button className="cms-quiet-btn" onClick={() => { void refresh(); }} type="button">Try again</button></div>
            : analytics
              ? <div className="cms-analytics-metrics">
                <article><span>ALL-TIME SESSIONS</span><strong>{analytics.totalSessions.toLocaleString()}</strong><small>Since analytics was enabled</small></article>
                <article><span>TODAY (UTC)</span><strong>{analytics.sessionsToday.toLocaleString()}</strong><small>Anonymous sessions today</small></article>
                <article><span>LAST 7 DAYS (UTC)</span><strong>{analytics.sessionsLast7Days.toLocaleString()}</strong><small>Anonymous sessions in the past week</small></article>
              </div>
              : <p className="cms-analytics-message">Loading visitor analytics...</p>}
          <p className="cms-analytics-note">Counts represent browser sessions, not verified individual people. Visitors can only be identified if they choose to contact you.</p>
        </section>
      </main>
    </div>
  );
}
