import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useGateway } from '@a5c-ai/agent-mux-ui';

import { useGatewayFetch } from '../providers/GatewayProvider.js';

type SessionTranscriptNode =
  | { kind: 'user'; text: string; runId: string }
  | { kind: 'assistant'; text: string; runId: string }
  | { kind: 'thinking'; text: string; runId: string }
  | { kind: 'tool'; text: string; runId: string; label: string };

type NativeSessionMessage = {
  role?: string;
  content?: string;
  thinking?: string;
  toolCalls?: Array<{
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    durationMs?: number;
  }>;
  toolResult?: {
    toolCallId?: string;
    toolName?: string;
    output?: unknown;
  };
};

type SessionCost = {
  totalUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cachedTokens?: number;
};

function formatUsd(totalUsd: number | null): string {
  if (totalUsd == null || !Number.isFinite(totalUsd)) {
    return 'unavailable';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: totalUsd >= 1 ? 2 : 4,
    maximumFractionDigits: 4,
  }).format(totalUsd);
}

function buildTranscript(
  runs: Array<Record<string, unknown>>,
  eventBuffers: Record<string, { events: Record<string, unknown>[] } | undefined>,
): SessionTranscriptNode[] {
  const orderedRuns = [...runs].sort((left, right) => Number(left.startedAt ?? 0) - Number(right.startedAt ?? 0));
  const nodes: SessionTranscriptNode[] = [];

  for (const run of orderedRuns) {
    const runId = String(run.runId ?? '');
    const buffer = eventBuffers[runId];
    if (!buffer) {
      continue;
    }
    let currentAssistantText = '';
    let currentThinkingText = '';
    const flushAssistant = (): void => {
      if (!currentAssistantText) return;
      nodes.push({ kind: 'assistant', text: currentAssistantText, runId });
      currentAssistantText = '';
    };
    const flushThinking = (): void => {
      if (!currentThinkingText) return;
      nodes.push({ kind: 'thinking', text: currentThinkingText, runId });
      currentThinkingText = '';
    };
    for (const event of buffer.events) {
      const type = String(event.type ?? '');
      if (type === 'user_message') {
        flushThinking();
        flushAssistant();
        const text = String(event.text ?? '');
        if (text.length > 0) {
          nodes.push({ kind: 'user', text, runId });
        }
        continue;
      }
      if (type === 'thinking_delta') {
        const delta = String(event.delta ?? '');
        if (delta.length > 0) {
          currentThinkingText += delta;
        }
        continue;
      }
      if (type === 'thinking_stop') {
        const finalThinking = String(event.thinking ?? '');
        if (finalThinking.length > 0) {
          currentThinkingText = finalThinking;
        }
        flushThinking();
        continue;
      }
      if (type === 'text_delta') {
        flushThinking();
        currentAssistantText += String(event.delta ?? '');
        continue;
      }
      if (type === 'message_stop') {
        flushThinking();
        const finalText = String(event.text ?? '');
        if (finalText.length > 0) {
          currentAssistantText = finalText;
        }
        flushAssistant();
        continue;
      }
      flushThinking();
      flushAssistant();
      if (type === 'tool_call_start' || type === 'tool_call_ready') {
        nodes.push({
          kind: 'tool',
          runId,
          label: `start ${String(event.toolName ?? 'tool')}`,
          text:
            type === 'tool_call_ready'
              ? JSON.stringify(event.input ?? {}, null, 2)
              : String(event.inputAccumulated ?? ''),
        });
        continue;
      }
      if (type === 'tool_result' || type === 'tool_error') {
        nodes.push({
          kind: 'tool',
          runId,
          label: String(event.toolName ?? 'tool'),
          text: JSON.stringify(event, null, 2),
        });
      }
    }
    flushThinking();
    flushAssistant();
  }

  return nodes;
}

function renderToolPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildNativeTranscript(sessionId: string, messages: NativeSessionMessage[]): SessionTranscriptNode[] {
  const nodes: SessionTranscriptNode[] = [];
  for (const [index, message] of messages.entries()) {
    const runId = `${sessionId}:native:${index}`;
    if (message.role === 'user' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({ kind: 'user', text: message.content, runId });
      continue;
    }
    if (typeof message.thinking === 'string' && message.thinking.length > 0) {
      nodes.push({ kind: 'thinking', text: message.thinking, runId });
    }
    if (Array.isArray(message.toolCalls)) {
      for (const toolCall of message.toolCalls) {
        nodes.push({
          kind: 'tool',
          runId,
          label: String(toolCall.toolName ?? 'tool'),
          text: renderToolPayload({
            input: toolCall.input,
            output: toolCall.output,
            durationMs: toolCall.durationMs,
          }),
        });
      }
    }
    if (message.role === 'tool' && message.toolResult) {
      nodes.push({
        kind: 'tool',
        runId,
        label: String(message.toolResult.toolName ?? 'tool'),
        text: renderToolPayload(message.toolResult.output),
      });
      continue;
    }
    if (message.role === 'assistant' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({ kind: 'assistant', text: message.content, runId });
      continue;
    }
    if (message.role === 'system' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({ kind: 'tool', text: message.content, runId, label: 'system' });
    }
  }
  return nodes;
}

export function SessionDetailPage(): JSX.Element {
  const params = useParams<{ agent: string; sessionId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = params.sessionId ?? '';
  const agentParam = params.agent ?? 'agent';
  const fetchGateway = useGatewayFetch();
  const { client, store } = useGateway();
  const session = useStore(store, (state) => state.sessions.byId[sessionId] ?? null);
  const runs = useStore(
    store,
    useShallow((state) =>
      Object.values(state.runs.byId)
        .filter((run) => run.sessionId === sessionId)
        .sort((left, right) => Number(right.startedAt ?? 0) - Number(left.startedAt ?? 0)),
    ),
  );
  const eventBuffers = useStore(store, (state) => state.events.byRunId);

  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeMessages, setNativeMessages] = useState<NativeSessionMessage[]>([]);
  const [loadingNativeTranscript, setLoadingNativeTranscript] = useState(false);

  const resolvedAgent = String(session?.agent ?? runs[0]?.agent ?? agentParam);
  const status = String(session?.status ?? 'inactive');
  const sessionCost =
    session?.cost && typeof session.cost === 'object'
      ? session.cost as SessionCost
      : null;
  const canCompose = status !== 'active';
  const activeRunId =
    typeof session?.activeRunId === 'string'
      ? session.activeRunId
      : typeof runs.find((run) => run.status === 'running')?.runId === 'string'
        ? String(runs.find((run) => run.status === 'running')?.runId)
        : null;
  const eventTranscript = useMemo(() => buildTranscript(runs, eventBuffers), [eventBuffers, runs]);
  const nativeTranscript = useMemo(() => buildNativeTranscript(sessionId, nativeMessages), [nativeMessages, sessionId]);
  const transcript =
    status === 'active'
      ? (eventTranscript.length > 0 ? eventTranscript : nativeTranscript)
      : (nativeTranscript.length > 0 ? nativeTranscript : eventTranscript);

  useEffect(() => {
    if (!sessionId) {
      setNativeMessages([]);
      setLoadingNativeTranscript(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setLoadingNativeTranscript(true);
    setNativeMessages([]);
    void (async () => {
      try {
        const response = await fetchGateway(`/api/v1/sessions/${encodeURIComponent(sessionId)}/full`);
        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) {
              setNativeMessages([]);
            }
            return;
          }
          throw new Error(`Gateway request failed: ${response.status}`);
        }
        const body = await response.json() as {
          title?: string;
          turnCount?: number;
          model?: string;
          cost?: SessionCost;
          cwd?: string;
          messages?: NativeSessionMessage[];
        };
        if (cancelled) {
          return;
        }
        if (Array.isArray(body.messages)) {
          setNativeMessages(body.messages);
        }
        store.getState().actions.mergeSession(sessionId, {
          title: body.title,
          turnCount: body.turnCount,
          model: body.model,
          cost: body.cost,
          cwd: body.cwd,
        });
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (!cancelled) {
          setLoadingNativeTranscript(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchGateway, sessionId, store]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetchGateway(`/api/v1/sessions/${encodeURIComponent(sessionId)}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agent: resolvedAgent,
        }),
      });
      if (!response.ok) {
        throw new Error(`Gateway request failed: ${response.status}`);
      }
      const body = (await response.json()) as {
        run?: Record<string, unknown>;
        session?: Record<string, unknown>;
      };
      if (body.run && typeof body.run.runId === 'string') {
        store.getState().actions.mergeRun(body.run.runId, body.run);
        client.subscribeRun(body.run.runId);
      }
      if (body.session && typeof body.session.sessionId === 'string') {
        store.getState().actions.mergeSession(body.session.sessionId, body.session);
      }
      setPrompt('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flow-grid">
      <article className="panel run-shell">
        <header>
          <div>
            <p className="eyebrow">Session Chat</p>
            <h2>{sessionId || 'Missing session id'}</h2>
          </div>
          <div className="status-stack">
            <span className={`status-badge status-${status}`}>{status}</span>
            <span className="meta-chip">{resolvedAgent}</span>
          </div>
        </header>

        <div className="transcript">
          {transcript.map((node, index) => (
            <article
              key={`${node.runId}-${index}`}
              className={`message ${
                node.kind === 'assistant'
                  ? 'agent-message'
                  : node.kind === 'user'
                    ? 'user-message'
                    : node.kind === 'thinking'
                      ? 'thinking-message'
                      : 'tool-message'
              }`}
            >
              <div className="message-meta">
                {node.kind === 'assistant'
                  ? 'assistant'
                  : node.kind === 'user'
                    ? 'user'
                    : node.kind === 'thinking'
                      ? 'thinking'
                      : node.label}
                <span className="message-run">session run {node.runId}</span>
              </div>
              <pre>{node.text}</pre>
            </article>
          ))}
          {transcript.length === 0 && loadingNativeTranscript ? <p className="muted-copy">Loading session transcript…</p> : null}
          {transcript.length === 0 && !loadingNativeTranscript ? <p className="muted-copy">No session transcript has been indexed yet.</p> : null}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <label className="field">
            <span>{status === 'active' ? 'Wait for the current live turn to finish' : 'Continue this session with a new turn'}</span>
            <textarea
              autoFocus={searchParams.get('compose') === '1'}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder={status === 'active' ? 'The live session is still running…' : 'Type the next message for this session…'}
              disabled={!canCompose}
            />
          </label>
          {error ? <p className="error-banner">{error}</p> : null}
          <div className="actions">
            <button type="submit" disabled={sending || !prompt.trim() || !canCompose}>
              {sending ? 'Sending…' : 'Continue session'}
            </button>
            {activeRunId ? (
              <Link className="ghost-link" to={`/runs/${activeRunId}`}>
                Open live bridge
              </Link>
            ) : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <header>
          <h2>Session State</h2>
        </header>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Session</span>
            <strong>{sessionId || 'unknown'}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Agent</span>
            <strong>{resolvedAgent}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">State</span>
            <strong>{status}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Live process</span>
            <strong>{activeRunId ?? 'none running'}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Session cost</span>
            <strong>{formatUsd(sessionCost?.totalUsd ?? null)}</strong>
          </div>
        </div>

        {sessionCost ? (
          <p className="muted-copy">
            Tokens in {sessionCost.inputTokens ?? 0} · out {sessionCost.outputTokens ?? 0}
            {sessionCost.thinkingTokens != null ? ` · thinking ${sessionCost.thinkingTokens}` : ''}
            {sessionCost.cachedTokens != null ? ` · cached ${sessionCost.cachedTokens}` : ''}
          </p>
        ) : null}

        <div className="list-grid">
          {runs.map((run) => (
            <article key={String(run.runId)} className="list-card">
              <div className="list-card-main">
                <strong>{String(run.runId)}</strong>
                <span className={`status-badge status-${String(run.status ?? 'unknown')}`}>
                  {String(run.status ?? 'unknown')}
                </span>
              </div>
              <div className="actions">
                <Link className="ghost-link" to={`/runs/${run.runId}`}>
                  Live bridge
                </Link>
              </div>
            </article>
          ))}
          {runs.length === 0 ? <p className="muted-copy">No live processes recorded for this session yet.</p> : null}
        </div>
      </article>
    </section>
  );
}
