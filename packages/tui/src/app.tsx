import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { AgentMuxClient, AgentEvent } from '@a5c-ai/agent-mux';
import { createRegistry, createContext, loadPlugins, type Registry } from './registry.js';
import type { TuiPlugin, TuiViewProps, EventRenderer } from './plugin.js';
import { EventStream } from './event-stream.js';
import { PromptInput } from './prompt-input.js';

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

  const { registry, stream } = useMemo(() => {
    const r: Registry = createRegistry();
    const s = new EventStream();
    const ctx = createContext(
      client,
      r,
      (ev) => {
        if (ev.type === 'status') setStatus(ev.message);
        if (ev.type === 'view:switch') setActiveId(ev.id);
      },
      s,
    );
    void loadPlugins(plugins, ctx);
    return { registry: r, stream: s };
  }, [client, plugins]);

  useInput((input, key) => {
    if (promptMode) return; // PromptInput owns keys while open
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    if (input === 'p') {
      setPromptMode(true);
      return;
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
      const handle = client.run({ agent: defaultAgent as never, prompt });
      for await (const ev of handle) {
        stream.push(ev as AgentEvent);
      }
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
          <ViewWithRenderers client={client} active={true} eventStream={stream} />
        ) : (
          <Text dimColor>No views registered.</Text>
        )}
      </Box>
      {promptMode ? (
        <PromptInput
          onSubmit={handlePromptSubmit}
          onCancel={() => setPromptMode(false)}
        />
      ) : (
        <Box>
          <Text dimColor>{status || 'p: prompt · q: quit'}</Text>
        </Box>
      )}
    </Box>
  );
}
