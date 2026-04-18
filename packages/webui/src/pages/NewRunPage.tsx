import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAgents, useGateway } from '@a5c-ai/agent-mux-ui';
import { useStore } from 'zustand';

import { useGatewayFetch } from '../providers/GatewayProvider.js';

function firstAgent(agents: string[], preferred: string | null): string {
  if (preferred && agents.includes(preferred)) {
    return preferred;
  }
  return agents[0] ?? 'codex';
}

function isSessionCapable(record: Record<string, unknown> | null): boolean {
  return (
    record?.['supportsInteractiveMode'] === true ||
    record?.['structuredSessionTransport'] === 'persistent'
  );
}

export function NewRunPage(): JSX.Element {
  const navigate = useNavigate();
  const fetchGateway = useGatewayFetch();
  const { client, store } = useGateway();
  const [searchParams] = useSearchParams();
  const agents = useAgents();
  const requestedAgent = searchParams.get('agent');
  const [agent, setAgent] = useState(() => firstAgent(agents, requestedAgent));
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentRecords = useStore(store, (state) => state.agents.byId);
  const agentRecord = useStore(store, (state) => state.agents.byId[agent] ?? null);
  const sessionAgents = useMemo(() => {
    const filtered = agents.filter((item) => isSessionCapable(agentRecords[item] ?? null));
    return filtered.length > 0 ? filtered : agents;
  }, [agentRecords, agents]);

  useEffect(() => {
    setAgent((current) => {
      if (sessionAgents.length === 0) {
        return current;
      }
      if (sessionAgents.includes(current)) {
        return current;
      }
      return firstAgent(sessionAgents, requestedAgent);
    });
  }, [requestedAgent, sessionAgents]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!prompt.trim() || !agent) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetchGateway('/api/v1/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agent, prompt }),
      });
      if (!response.ok) {
        throw new Error(`Gateway request failed: ${response.status}`);
      }
      const body = (await response.json()) as { run?: Record<string, unknown> };
      const run = body.run;
      const runId = typeof run?.runId === 'string' ? run.runId : null;
      if (!runId) {
        throw new Error('Gateway did not return a run id');
      }
      store.getState().actions.mergeRun(runId, run ?? {});
      client.subscribeRun(runId);
      navigate(`/runs/${runId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flow-grid">
      <article className="panel hero-panel">
        <p className="eyebrow">New Session</p>
        <h2>Start a real conversation</h2>
        <p className="lede">
          This creates a real session on the selected harness. Once the harness emits the session id,
          the browser moves into the session chat view.
        </p>
      </article>

      <article className="panel">
        <header>
          <h2>Compose First Turn</h2>
        </header>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Agent</span>
            <select value={agent} onChange={(event) => setAgent(event.target.value)}>
              {sessionAgents.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {agentRecord ? (
            <p className="muted-copy">
              {agentRecord.structuredSessionTransport === 'persistent'
                ? 'Structured session transport: persistent live connection.'
                : agentRecord.structuredSessionTransport === 'restart-per-turn'
                  ? 'Structured session transport: resume by starting a fresh run for each turn.'
                  : 'Structured session transport: unavailable.'}
            </p>
          ) : null}

          {sessionAgents.length !== agents.length ? (
            <p className="muted-copy">
              The browser is showing only transports that can keep a session interactive or persistent.
            </p>
          ) : null}

          <label className="field">
            <span>Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the task you want the agent to handle..."
              rows={10}
            />
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <div className="actions">
            <button type="submit" disabled={submitting || !prompt.trim()}>
              {submitting ? 'Starting…' : 'Start session'}
            </button>
            <Link className="ghost-link" to="/sessions">
              Browse sessions
            </Link>
          </div>
        </form>
      </article>
    </section>
  );
}
