import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useRun } from '@a5c-ai/agent-mux-ui';

export function RunPage(): JSX.Element {
  const params = useParams<{ runId: string }>();
  const runId = params.runId ?? '';
  const run = useRun(runId);

  if (typeof run?.sessionId === 'string' && typeof run?.agent === 'string') {
    return <Navigate to={`/sessions/${run.sessionId}`} replace />;
  }

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Establishing Session</p>
          <h2>{runId || 'unknown run'}</h2>
        </div>
      </header>
      <p className="lede">
        The harness has started, but the session id has not been emitted yet. This page will redirect
        into the session chat view as soon as the gateway sees the real session.
      </p>
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Agent</span>
          <strong>{String(run?.agent ?? 'unknown')}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">State</span>
          <strong>{String(run?.status ?? 'starting')}</strong>
        </div>
      </div>
      <div className="actions">
        <Link className="ghost-link" to="/sessions">
          Back to sessions
        </Link>
      </div>
    </section>
  );
}
