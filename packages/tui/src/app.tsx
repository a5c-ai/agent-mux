import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { AgentMuxClient, AgentEvent, RunHandle } from '@a5c-ai/agent-mux';
import { createRegistry, createContext, loadPlugins, type Registry } from './registry.js';
import type { TuiPlugin, TuiViewProps, EventRenderer } from './plugin.js';
import { EventStream } from './event-stream.js';
import { PromptInput } from './prompt-input.js';
import { CommandPalette, type PaletteAction } from './command-palette.js';

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

export function App({ client, plugins, defaultAgent = 'claude-code' }: AppProps) {
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
          setStatus(`Resuming ${ev.agent}/${ev.sessionId} — press p to send next message`);
        }
      },
      s,
    );
    void loadPlugins(plugins, ctx);
    return { registry: r, stream: s };
  }, [client, plugins]);

  useInput((input, key) => {
    if (promptMode || filterMode || paletteMode) return; // child input owns keys while open
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    if (input === 'p') {
      setPromptMode(true);
      return;
    }
    if (input === '/') {
      setFilterMode(true);
      return;
    }
    if (input === ':' || (key.ctrl && input === 'k')) {
      setPaletteMode(true);
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
  const ActiveView = active?.component;

  const viewEmit = (ev: Parameters<TuiViewProps['emit']>[0]) => {
    if (ev.type === 'status') setStatus(ev.message);
    else if (ev.type === 'view:switch') setActiveId(ev.id);
    else if (ev.type === 'session:select') {
      setPendingResume({ agent: ev.agent, sessionId: ev.sessionId });
      setStatus(`Resuming ${ev.agent}/${ev.sessionId} — press p to send next message`);
    } else if (ev.type === 'event') stream.push(ev.event);
  };

  // Inject renderers+stream into whichever view is active by using a thin wrapper.
  const ViewWithRenderers = ActiveView
    ? (props: TuiViewProps) => {
        const Wrapped = ActiveView as React.ComponentType<TuiViewProps & { renderers: EventRenderer[] }>;
        return <Wrapped {...props} renderers={registry.renderers} />;
      }
    : undefined;

  async function handlePromptSubmit(prompt: string) {
    setPromptMode(false);
    if (!prompt.trim()) return;
    setStatus(`Dispatching to ${defaultAgent}…`);

    // If a plugin registered a prompt handler, it wins.
    if (registry.promptHandlers.length > 0) {
      for (const h of registry.promptHandlers) await h(prompt);
      return;
    }

    try {
      const runOpts: { agent: string; prompt: string; sessionId?: string } = {
        agent: pendingResume?.agent ?? defaultAgent,
        prompt,
      };
      if (pendingResume) runOpts.sessionId = pendingResume.sessionId;
      setPendingResume(null);
      const handle = client.run(runOpts as never);
      currentHandleRef.current = handle;
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
        }
        stream.push(agentEv);
      }
      currentHandleRef.current = null;
      setStatus('Run complete.');
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
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
      {promptMode ? (
        <PromptInput
          onSubmit={handlePromptSubmit}
          onCancel={() => setPromptMode(false)}
        />
      ) : (
        <Box flexDirection="column">
          {status ? <Text dimColor>{status}</Text> : null}
          <Box>
            <Text dimColor>p: prompt · /: filter · :: palette</Text>
            {filter ? <Text color="cyan"> · filter=&quot;{filter}&quot;</Text> : null}
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
        </Box>
      )}
    </Box>
  );
}
