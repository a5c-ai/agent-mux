import React, { useMemo, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type { AgentMuxClient } from '@a5c-ai/agent-mux';
import { createRegistry, createContext, loadPlugins } from './registry.js';
import type { TuiPlugin } from './plugin.js';

export interface AppProps {
  client: AgentMuxClient;
  plugins: TuiPlugin[];
}

export function App({ client, plugins }: AppProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<string>('');
  const [activeId, setActiveId] = useState<string>('chat');

  const registry = useMemo(() => {
    const r = createRegistry();
    const ctx = createContext(client, r, (ev) => {
      if (ev.type === 'status') setStatus(ev.message);
      if (ev.type === 'view:switch') setActiveId(ev.id);
    });
    // synchronous-only plugin registration for the scaffold
    void loadPlugins(plugins, ctx);
    return r;
  }, [client, plugins]);

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
      return;
    }
    for (const v of registry.views) {
      if (v.hotkey && input === v.hotkey) setActiveId(v.id);
    }
    for (const c of registry.commands) {
      if (input === c.hotkey) {
        void c.run({
          client,
          registerView: () => {},
          registerEventRenderer: () => {},
          registerCommand: () => {},
          emit: (e) => {
            if (e.type === 'status') setStatus(e.message);
          },
        });
      }
    }
  });

  const active = registry.views.find((v) => v.id === activeId) ?? registry.views[0];
  const ActiveView = active?.component;

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
        {ActiveView ? <ActiveView client={client} active={true} /> : <Text dimColor>No views registered.</Text>}
      </Box>
      <Box>
        <Text dimColor>{status || 'q: quit'}</Text>
      </Box>
    </Box>
  );
}
