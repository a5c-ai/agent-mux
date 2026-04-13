import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { HookConfigManager } from '@a5c-ai/agent-mux-core';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  id: string;
  hookType: string;
  handler: string;
  target?: string;
  enabled?: boolean;
  priority?: number;
}

function HooksView({ active }: TuiViewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const mgr = new HookConfigManager();
        const list = await mgr.list();
        setRows(list.map((h) => ({
          id: h.id,
          hookType: h.hookType,
          handler: h.handler,
          target: h.target,
          enabled: h.enabled,
          priority: h.priority,
        })));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [active]);
  if (error) return <Text color="red">{error}</Text>;
  if (rows.length === 0) return <Text dimColor>No hooks registered. Use `amux hooks &lt;agent&gt; add` to register.</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>Hooks</Text>
      <Text dimColor>(see also: amux hooks &lt;agent&gt; &lt;discover|list|add|remove|set&gt;)</Text>
      {rows.slice(0, 40).map((r, i) => (
        <Text key={r.id + ':' + i}>
          <Text color="cyan">{r.id.padEnd(20)}</Text>{' '}
          <Text>{r.hookType.padEnd(18)}</Text>{' '}
          <Text color="gray">{r.handler.padEnd(8)}</Text>{' '}
          {r.target ? <Text dimColor>{r.target}</Text> : null}
          {r.enabled === false ? <Text color="gray"> (disabled)</Text> : null}
        </Text>
      ))}
      {rows.length > 40 ? <Text dimColor>… {rows.length - 40} more</Text> : null}
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:hooks-view',
  register(ctx) {
    ctx.registerView({
      id: 'hooks',
      title: 'Hooks',
      hotkey: 'h',
      component: HooksView,
    });
  },
});
