import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { logger } from '@a5c-ai/agent-mux-observability';
import type { AgentMuxClient, AgentEvent, RunHandle } from '@a5c-ai/agent-mux';
import { createRegistry, createContext, loadPlugins, type Registry } from './registry.js';
import type { TuiPlugin, TuiViewProps, EventRenderer } from './plugin.js';
import { EventStream } from './event-stream.js';
import { PromptInput } from './prompt-input.js';
import { CommandPalette, type PaletteAction } from './command-palette.js';
import { ModelPicker, type ModelOption } from './model-picker.js';
import { loadHistory, appendHistory } from './prompt-history-store.js';

export interface AppProps {
  client: AgentMuxClient;
  plugins: TuiPlugin[];
  defaultAgent?: string;
}

function pickRenderers(renderers: EventRenderer[], ev: AgentEvent): EventRenderer | undefined {
  const specific = renderers.find((r) => r.id !== 'fallback' && r.match(ev));
  if (specific) return specific;
  return renderers.find((r) => r.id === 'fallback');
}

export function App({ client, plugins, defaultAgent = 'claude' }: AppProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<string>('');
  const [activeId, setActiveId] = useState<string>('chat');
  const [promptMode, setPromptMode] = useState<boolean>(false);
  const [pendingResume, setPendingResume] = useState<
    { agent: string; sessionId: string } | null
  >(null);
  const currentHandleRef = React.useRef<RunHandle | null>(null);
  const pendingApprovalRef = React.useRef<{ interactionId: string; action: string } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<
    { interactionId: string; action: string; riskLevel: string } | null
  >(null);
  const [filterMode, setFilterMode] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('');
  const [paletteMode, setPaletteMode] = useState<boolean>(false);
  const [selection, setSelection] = useState<{ agent: string; sessionId: string } | undefined>(
    undefined,
  );
  const [modelPickerMode, setModelPickerMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<ModelOption | undefined>(undefined);
  const [agentPickerMode, setAgentPickerMode] = useState<boolean>(false);
  const [currentAgent, setCurrentAgent] = useState<string | undefined>(undefined);
  const [profilePickerMode, setProfilePickerMode] = useState<boolean>(false);
  const [currentProfile, setCurrentProfile] = useState<string | undefined>(undefined);
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
  const diffLeftRef = React.useRef<{ agent: string; sessionId: string } | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>(() => loadHistory());
  const [activeSessions, setActiveSessions] = useState<ReadonlySet<string>>(() => new Set());
  function markActive(agent: string, sessionId: string) {
    setActiveSessions((prev) => {
      const next = new Set(prev);
      next.add(`${agent}:${sessionId}`);
      return next;
    });
  }
  function unmarkActive(agent: string, sessionId: string) {
    setActiveSessions((prev) => {
      const next = new Set(prev);
      next.delete(`${agent}:${sessionId}`);
      return next;
    });
  }
  const EXEC_MODES = ['normal', 'bypass', 'planning', 'deny'] as const;
  type ExecMode = (typeof EXEC_MODES)[number];
  const EXEC_MODE_COLORS: Record<ExecMode, string> = {
    normal: 'cyan',
    bypass: 'red',
    planning: 'yellow',
    deny: 'magenta',
  };
  const [execMode, setExecMode] = useState<ExecMode>('normal');
  function cycleExecMode() {
    setExecMode((m) => {
      const i = EXEC_MODES.indexOf(m);
      const next = EXEC_MODES[(i + 1) % EXEC_MODES.length];
      setStatus(`Mode: ${next}`);
      return next;
    });
  }

  const availableModels = useMemo<ModelOption[]>(() => {
    try {
      const out: ModelOption[] = [];
      for (const a of client.adapters.list()) {
        for (const m of client.models.models(a.agent)) {
          out.push({ agent: a.agent, modelId: m.modelId });
        }
      }
      return out;
    } catch {
      return [];
    }
  }, [client]);

  const { registry, stream } = useMemo(() => {
    const r: Registry = createRegistry();
    const s = new EventStream();
    const ctx = createContext(
      client,
      r,
      (ev) => {
        if (ev.type === 'status') setStatus(ev.message);
        if (ev.type === 'view:switch') setActiveId(ev.id);
        if (ev.type === 'session:select') {
          setPendingResume({ agent: ev.agent, sessionId: ev.sessionId });
          setStatus(`Resuming ${ev.agent}/${ev.sessionId} — type to send next message`);
          void loadSessionTranscript(ev.agent, ev.sessionId);
        }
        if (ev.type === 'session:detail') {
          setSelection({ agent: ev.agent, sessionId: ev.sessionId });
        }
        if (ev.type === 'session:diff') {
          void handleSessionDiff(ev.agent, ev.sessionId);
        }
      },
      s,
    );
    void loadPlugins(plugins, ctx);
    return { registry: r, stream: s };
  }, [client, plugins]);

  useInput((input, key) => {
    if (promptMode || filterMode || paletteMode || modelPickerMode || profilePickerMode || agentPickerMode) return; // child input owns keys while open
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    // `p` intentionally not bound — chat view auto-focuses an inline prompt.
    if (input === '/') {
      setFilterMode(true);
      return;
    }
    if (input === ':' || (key.ctrl && input === 'k')) {
      setPaletteMode(true);
      return;
    }
    if (input === 'm' && availableModels.length > 0) {
      setModelPickerMode(true);
      return;
    }
    if (input === 'N') {
      setAgentPickerMode(true);
      return;
    }
    if (input === 'P') {
      void (async () => {
        try {
          const list = await client.profiles.list();
          setAvailableProfiles(list.map((p) => p.name));
          setProfilePickerMode(true);
        } catch (e) {
          setStatus(`profiles: ${(e as Error).message}`);
        }
      })();
      return;
    }
    if (input === 'i' && currentHandleRef.current) {
      void currentHandleRef.current.interrupt();
      setStatus('Interrupting current run…');
      return;
    }
    if (pendingApproval && currentHandleRef.current) {
      if (input === 'y') {
        void currentHandleRef.current.approve();
        setPendingApproval(null);
        pendingApprovalRef.current = null;
        setStatus('Approved.');
        return;
      }
      if (input === 'n') {
        void currentHandleRef.current.deny('Denied from TUI');
        setPendingApproval(null);
        pendingApprovalRef.current = null;
        setStatus('Denied.');
        return;
      }
    }
    for (const v of registry.views) {
      if (v.hotkey && input === v.hotkey) setActiveId(v.id);
    }
    for (const c of registry.commands) {
      if (input === c.hotkey) {
        void c.run({
          client,
          eventStream: stream,
          registerView: () => {},
          registerEventRenderer: () => {},
          registerCommand: () => {},
          registerPromptHandler: () => {},
          emit: (e) => {
            if (e.type === 'status') setStatus(e.message);
            if (e.type === 'event') stream.push(e.event);
          },
        });
      }
    }
  });

  const active = registry.views.find((v) => v.id === activeId) ?? registry.views[0];

  // Chat view has an always-on inline prompt. Auto-focus when entering chat
  // and no modal is open. Esc inside PromptInput flips promptMode off, which
  // re-enables global hotkeys; any hotkey that switches away from chat also
  // clears it. This is the simplest model that keeps global navigation working.
  useEffect(() => {
    if (
      active?.id === 'chat' &&
      !promptMode &&
      !filterMode &&
      !paletteMode &&
      !modelPickerMode &&
      !profilePickerMode &&
      !agentPickerMode
    ) {
      setPromptMode(true);
    }
    if (active?.id !== 'chat' && promptMode) {
      setPromptMode(false);
    }
  }, [active?.id, filterMode, paletteMode, modelPickerMode, profilePickerMode, agentPickerMode, promptMode]);
  const ActiveView = active?.component;

  const viewEmit = (ev: Parameters<TuiViewProps['emit']>[0]) => {
    if (ev.type === 'status') setStatus(ev.message);
    else if (ev.type === 'view:switch') setActiveId(ev.id);
    else if (ev.type === 'session:select') {
      setPendingResume({ agent: ev.agent, sessionId: ev.sessionId });
      setStatus(`Resuming ${ev.agent}/${ev.sessionId} — type to send next message`);
      void loadSessionTranscript(ev.agent, ev.sessionId);
      setActiveId('chat');
    } else if (ev.type === 'session:detail') {
      setSelection({ agent: ev.agent, sessionId: ev.sessionId });
    } else if (ev.type === 'session:diff') {
      void handleSessionDiff(ev.agent, ev.sessionId);
    } else if (ev.type === 'event') stream.push(ev.event);
  };

  async function loadSessionTranscript(agent: string, sessionId: string) {
    try {
      const full = await client.sessions.get(agent as never, sessionId);
      stream.reset();
      for (const m of full.messages) {
        if (!m.content) continue;
        stream.push({
          runId: 'transcript',
          agent,
          timestamp: (m.timestamp ?? new Date()).toISOString(),
          type: 'text_delta',
          delta: `[${m.role}] ${m.content}\n`,
        } as never);
      }
      setStatus(`Loaded ${full.messages.length} messages from ${agent}/${sessionId}`);
    } catch (e) {
      setStatus(`transcript load failed: ${(e as Error).message}`);
    }
  }

  async function handleSessionDiff(agent: string, sessionId: string) {
    const left = diffLeftRef.current;
    if (!left) {
      diffLeftRef.current = { agent, sessionId };
      setStatus(`diff: marked ${agent}/${sessionId} as A — press D on another session to compare`);
      return;
    }
    diffLeftRef.current = null;
    setStatus(`diff: computing ${left.agent}/${left.sessionId} ↔ ${agent}/${sessionId}…`);
    try {
      const result = await client.sessions.diff(
        { agent: left.agent as never, sessionId: left.sessionId },
        { agent: agent as never, sessionId },
      );
      const sum = result.summary;
      const head = result.operations
        .slice(0, 30)
        .map((o, i) => `${i + 1}. ${(o as { kind?: string }).kind ?? 'op'}`)
        .join('\n');
      const text =
        `\n--- session diff ---\n` +
        `A: ${left.agent}/${left.sessionId}\n` +
        `B: ${agent}/${sessionId}\n` +
        `+${sum.added} -${sum.removed} ~${sum.modified} =${sum.unchanged}\n` +
        head +
        (result.operations.length > 30 ? `\n… ${result.operations.length - 30} more ops` : '') +
        `\n`;
      stream.push({
        runId: 'diff',
        agent: left.agent,
        timestamp: new Date().toISOString(),
        type: 'text_delta',
        delta: text,
      } as never);
      setActiveId('chat');
      setStatus('diff: done.');
    } catch (e) {
      setStatus(`diff failed: ${(e as Error).message}`);
    }
  }

  // Inject renderers+stream into whichever view is active by using a thin wrapper.
  const ViewWithRenderers = ActiveView
    ? (props: TuiViewProps) => {
        const Wrapped = ActiveView as React.ComponentType<TuiViewProps & { renderers: EventRenderer[] }>;
        return <Wrapped {...props} renderers={registry.renderers} />;
      }
    : undefined;

  async function handlePromptSubmit(prompt: string) {
    if (!prompt.trim()) return;
    setPromptHistory((h) => {
      const next = h.filter((p) => p !== prompt);
      next.push(prompt);
      return next.slice(-200);
    });
    appendHistory(prompt);

    // If a plugin registered a prompt handler, it wins.
    if (registry.promptHandlers.length > 0) {
      for (const h of registry.promptHandlers) await h(prompt);
      return;
    }

    // If a run is already live, inject into its stdin rather than spawning a
    // fresh process — keeps follow-ups inside the same session & context.
    if (currentHandleRef.current) {
      try {
        setStatus('Sending to active run…');
        await currentHandleRef.current.send(prompt);
      } catch (e) {
        setStatus(`send failed: ${(e as Error).message}`);
      }
      return;
    }

    setStatus(`Dispatching to ${currentAgent ?? defaultAgent}…`);

    try {
      const baseOpts: Partial<{ agent: string; model: string }> = currentProfile
        ? ((await client.profiles.apply(currentProfile)) as Partial<{ agent: string; model: string }>)
        : {};
      const selectedAgent = currentModel?.agent ?? currentAgent ?? baseOpts.agent ?? defaultAgent;
      // TODO: cross-harness resume/fork — if the user picked a different
      // agent than the session's origin we'd need a transcript-export /
      // re-import path. For now, refuse explicitly.
      if (pendingResume && pendingResume.agent !== selectedAgent && (currentModel || currentAgent)) {
        setStatus(`Cannot resume ${pendingResume.agent} session with ${selectedAgent}: cross-harness resume not implemented yet.`);
        return;
      }
      const runOpts: {
        agent: string;
        prompt: string;
        sessionId?: string;
        model?: string;
        approvalMode?: 'yolo' | 'prompt' | 'deny';
      } = {
        agent: pendingResume?.agent ?? selectedAgent,
        prompt,
      };
      if (pendingResume) runOpts.sessionId = pendingResume.sessionId;
      if (currentModel) runOpts.model = currentModel.modelId;
      else if (baseOpts.model) runOpts.model = baseOpts.model;
      // Map TUI execMode → SDK approvalMode. "planning" has no SDK analogue
      // yet; treat it as strict prompt mode and surface a status hint so the
      // user knows the intent is advisory.
      if (execMode === 'bypass') runOpts.approvalMode = 'yolo';
      else if (execMode === 'deny') runOpts.approvalMode = 'deny';
      else if (execMode === 'planning') {
        // No SDK analogue yet — fall back to prompt approvals and flag it.
        runOpts.approvalMode = 'prompt';
        setStatus('Planning mode: adapters do not expose a plan-only flag — running with prompt approvals.');
      } else runOpts.approvalMode = 'prompt';
      const resumedAgent = runOpts.agent;
      let resumedSessionId = runOpts.sessionId;
      const handle = client.run(runOpts as never);
      currentHandleRef.current = handle;
      if (resumedSessionId) markActive(resumedAgent, resumedSessionId);
      for await (const ev of handle) {
        const agentEv = ev as AgentEvent;
        if (agentEv.type === 'approval_request') {
          const pending = {
            interactionId: agentEv.interactionId,
            action: agentEv.action,
            riskLevel: agentEv.riskLevel,
          };
          pendingApprovalRef.current = pending;
          setPendingApproval(pending);
        } else if (
          agentEv.type === 'approval_granted' ||
          agentEv.type === 'approval_denied'
        ) {
          pendingApprovalRef.current = null;
          setPendingApproval(null);
        } else if (agentEv.type === 'session_start') {
          const sid = (agentEv as unknown as { sessionId?: string }).sessionId;
          if (sid && !resumedSessionId) {
            resumedSessionId = sid;
            markActive(resumedAgent, sid);
            setPendingResume({ agent: resumedAgent, sessionId: sid });
          }
        }
        stream.push(agentEv);
      }
      currentHandleRef.current = null;
      if (resumedSessionId) unmarkActive(resumedAgent, resumedSessionId);
      setStatus('Run complete.');
      } catch (e) {
      logger.error({ error: e }, 'TUI run failed');
      // best-effort cleanup — we might not have started a session, but harmless

      // if the set doesn't contain the key.
      const msg = (e as Error).message;
      if (/ENOENT/.test(msg)) {
        const m = msg.match(/spawn (\S+)/);
        const bin = m?.[1] ?? 'agent CLI';
        setStatus(`Error: ${bin} is not installed. Try: amux install ${bin}`);
      } else {
        setStatus(`Error: ${msg}`);
      }
    }
  }

  return (
    <Box flexDirection="column">
      <Box>
        {registry.views.map((v) => (
          <Text key={v.id} color={v.id === active?.id ? 'green' : 'gray'}>
            [{v.hotkey ?? '?'}] {v.title}{'  '}
          </Text>
        ))}
      </Box>
      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        {ViewWithRenderers ? (
          <ViewWithRenderers
            client={client}
            active={true}
            eventStream={stream}
            emit={viewEmit}
            filter={filter || undefined}
            selection={selection}
            activeSessions={activeSessions}
          />
        ) : (
          <Text dimColor>No views registered.</Text>
        )}
      </Box>
      {pendingApproval ? (
        <Box>
          <Text color={pendingApproval.riskLevel === 'high' ? 'red' : 'yellow'}>
            [approval {pendingApproval.riskLevel}] {pendingApproval.action} — y: approve · n: deny
          </Text>
        </Box>
      ) : null}
      {filterMode ? (
        <PromptInput
          label="filter (substring or `type:<prefix>`)> "
          onSubmit={(v) => {
            setFilter(v);
            setFilterMode(false);
            setStatus(v ? `Filter: ${v}` : 'Filter cleared.');
          }}
          onCancel={() => setFilterMode(false)}
        />
      ) : null}
      {profilePickerMode ? (
        <ModelPicker
          models={availableProfiles.map((n) => ({ agent: 'profile', modelId: n }))}
          onCancel={() => setProfilePickerMode(false)}
          onPick={(m) => {
            setCurrentProfile(m.modelId);
            setProfilePickerMode(false);
            setStatus(`Profile: ${m.modelId}`);
          }}
        />
      ) : null}
      {modelPickerMode ? (
        <ModelPicker
          models={availableModels}
          onCancel={() => setModelPickerMode(false)}
          onPick={(m) => {
            setCurrentModel(m);
            setModelPickerMode(false);
            setStatus(`Model: ${m.agent}/${m.modelId}`);
          }}
        />
      ) : null}
      {agentPickerMode ? (
        <ModelPicker
          models={(() => {
            try { return client.adapters.list().map((a) => ({ agent: a.agent, modelId: a.displayName })); }
            catch { return []; }
          })()}
          onCancel={() => setAgentPickerMode(false)}
          onPick={(m) => {
            setCurrentAgent(m.agent);
            setCurrentModel(undefined);
            setAgentPickerMode(false);
            setStatus(`Agent: ${m.agent}`);
          }}
        />
      ) : null}
      {paletteMode ? (
        <CommandPalette
          views={registry.views}
          commands={registry.commands}
          onCancel={() => setPaletteMode(false)}
          onPick={(a: PaletteAction) => {
            setPaletteMode(false);
            if (a.id.startsWith('view:')) {
              setActiveId(a.id.slice('view:'.length));
            } else if (a.id.startsWith('cmd:')) {
              const cmdId = a.id.slice('cmd:'.length);
              const cmd = registry.commands.find((c) => c.id === cmdId);
              if (cmd) {
                void cmd.run({
                  client,
                  eventStream: stream,
                  registerView: () => {},
                  registerEventRenderer: () => {},
                  registerCommand: () => {},
                  registerPromptHandler: () => {},
                  emit: (e) => {
                    if (e.type === 'status') setStatus(e.message);
                    if (e.type === 'event') stream.push(e.event);
                  },
                });
              }
            }
          }}
        />
      ) : null}
      <Box flexDirection="column">
        {status ? <Text dimColor>{status}</Text> : null}
        <Box>
          <Text dimColor>shift+tab: mode · /: filter · :: palette · m: model · N: agent · P: profile</Text>
          <Text color={EXEC_MODE_COLORS[execMode]}> · mode={execMode}</Text>
          <Text color="cyan"> · agent={currentAgent ?? defaultAgent}</Text>
          {filter ? <Text color="cyan"> · filter=&quot;{filter}&quot;</Text> : null}
          {currentModel ? (
            <Text color="magenta"> · model={currentModel.agent}/{currentModel.modelId}</Text>
          ) : null}
          {currentProfile ? (
            <Text color="blue"> · profile={currentProfile}</Text>
          ) : null}
          {currentHandleRef.current ? <Text color="yellow"> · i: interrupt</Text> : null}
          {pendingApproval ? <Text color="yellow"> · y/n: approve/deny</Text> : null}
          <Text dimColor> · q: quit</Text>
          {registry.views.length > 1 ? (
            <Text dimColor>
              {' · '}
              {registry.views
                .filter((v) => v.hotkey)
                .map((v) => `${v.hotkey}:${v.title.toLowerCase()}`)
                .join(' ')}
            </Text>
          ) : null}
          {registry.commands.length > 0 ? (
            <Text dimColor>
              {' · '}
              {registry.commands.map((c) => `${c.hotkey}:${c.label}`).join(' ')}
            </Text>
          ) : null}
        </Box>
        {promptMode ? (
          <PromptInput
            label="> "
            labelColor={EXEC_MODE_COLORS[execMode]}
            onSubmit={handlePromptSubmit}
            onCancel={() => setPromptMode(false)}
            onShiftTab={cycleExecMode}
            history={promptHistory}
          />
        ) : null}
      </Box>
    </Box>
  );
}
