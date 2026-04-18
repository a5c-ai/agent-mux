import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useGateway } from '@a5c-ai/agent-mux-ui';

export function HomePage(): JSX.Element {
  const { store } = useGateway();
  const sessions = useStore(store, useShallow((state) => Object.values(state.sessions.byId)));
  const agents = useStore(store, (state) => state.agents.items);

  const orderedSessions = useMemo(
    () =>
      [...sessions]
        .sort((left, right) => Number(right.updatedAt ?? 0) - Number(left.updatedAt ?? 0))
        .slice(0, 8),
    [sessions],
  );

  const activeCount = sessions.filter((session) => session.status === 'active').length;
  const inactiveCount = sessions.filter((session) => session.status !== 'active').length;

  return (
    <section className="dashboard-layout">
      <article className="panel hero-panel">
        <p className="eyebrow">Session-First Flow</p>
        <h2>Sessions are the product. Live processes are just the current execution state.</h2>
        <p className="lede">
          Start a new session, talk inside the session view, and resume inactive sessions from the
          same place. The browser should not force you to think in terms of runs.
        </p>
        <div className="actions">
          <Link to="/sessions/new">Start session</Link>
          <Link className="ghost-link" to="/sessions">
            Open sessions
          </Link>
        </div>
      </article>

      <article className="panel">
        <header>
          <h2>Session Overview</h2>
        </header>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Active sessions</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Inactive sessions</span>
            <strong>{inactiveCount}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Available agents</span>
            <strong>{agents.length}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Primary action</span>
            <strong>Open a session chat</strong>
          </div>
        </div>
      </article>

      <article className="panel">
        <header>
          <h2>Recent Sessions</h2>
          <Link to="/sessions">View all</Link>
        </header>
        <div className="list-grid">
          {orderedSessions.map((session) => (
            <article key={String(session.sessionId)} className="list-card">
              <div className="list-card-main">
                <strong>{String(session.sessionId)}</strong>
                <span className="meta-chip">{String(session.agent ?? 'unknown')}</span>
                <span className={`status-badge status-${String(session.status ?? 'inactive')}`}>
                  {String(session.status ?? 'inactive')}
                </span>
              </div>
              <div className="actions">
                <Link className="ghost-link" to={`/sessions/${session.sessionId}`}>
                  Open chat
                </Link>
              </div>
            </article>
          ))}
          {orderedSessions.length === 0 ? <p className="muted-copy">No sessions have been created yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
