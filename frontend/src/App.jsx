import { useState, useCallback } from "react";
import "./index.css";
import UserTable from "./components/UserTable";
import CacheMonitor from "./components/CacheMonitor";

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [invalidationLog, setInvalidationLog] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", icon = "✓") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleUserUpdated = useCallback((user, invalidated) => {
    if (invalidated?.length) {
      const time = new Date().toLocaleTimeString();
      const entries = invalidated.map((k) => `[${time}] ${k}`);
      setInvalidationLog((prev) => [...prev, ...entries]);
    }
    addToast(
      `User ${user.name} updated. ${invalidated?.length ?? 0} cache key(s) evicted.`,
      "success",
      "⚡"
    );
  }, [addToast]);

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">⚡</div>
          <div>
            <div className="header-title">Redis Cache Demo</div>
            <div className="header-subtitle">L1 · L2 · Selective Invalidation</div>
          </div>
        </div>
        <div className="header-meta">
          <span className="header-badge">500 Users · Mock DB</span>
          <span className="header-badge">L1: Node LRU · L2: Redis</span>
          <span className="header-badge" style={{ color: "var(--accent-green)" }}>
            ● Live
          </span>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="app-main">
        <UserTable onUserUpdated={handleUserUpdated} />
      </main>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <CacheMonitor invalidationLog={invalidationLog} />
      </aside>

      {/* ── Toasts ── */}
      <Toast toasts={toasts} />
    </div>
  );
}
