import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { definePlugin, type TuiViewProps } from '../plugin.js';

interface Row {
  agent: string;
  pluginId: string;
  enabled: boolean;
  error?: string;
}

function McpView({ client, active }: TuiViewProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const all: Row[] = [];
        for (const a of client.adapters.list()) {
          try {
            const list = await client.plugins.list(a.agent);
            for (const p of list) {
              all.push({ agent: a.agent, pluginId: p.pluginId, enabled: !!p.enabled });
            }
          } catch (e) {
            const msg = (e as Error).message ?? String(e);
            // capability errors are expected for adapters without plugin support
            if (!/capability|not supported|CAPABILITY/i.test(msg)) {
              all.push({ agent: a.agent, pluginId: '(error)', enabled: false, error: msg });
            }
          }
        }
        setRows(all);
      } catch (e) {
        setError(String((e as Error).message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [active, client]);

  if (loading && rows.length === 0) return <Text dimColor>Loading MCP servers…</Text>;
  if (error) return <Text color="red">{error}</Text>;
  if (rows.length === 0)
    return (
      <Box flexDirection="column">
        <Text dimColor>No MCP servers installed.</Text>
        <Text dimColor>Install via: amux mcp install &lt;agent&gt; &lt;server&gt;</Text>
      </Box>
    );
  return (
    <Box flexDirection="column">
      <Text bold>MCP servers per agent</Text>
      {rows.slice(0, 40).map((r, i) => (
        <Text key={r.agent + ':' + r.pluginId + ':' + i}>
          <Text color="cyan">{r.agent.padEnd(14)}</Text>{' '}
          <Text>{r.pluginId}</Text>
          {r.enabled ? <Text color="green"> ✓</Text> : <Text dimColor> (disabled)</Text>}
          {r.error ? <Text color="red"> {r.error}</Text> : null}
        </Text>
      ))}
      {rows.length > 40 ? <Text dimColor>… {rows.length - 40} more</Text> : null}
      <Text dimColor>Manage via: amux mcp list|install|uninstall &lt;agent&gt; [server]</Text>
    </Box>
  );
}

export default definePlugin({
  name: 'builtin:mcp-view',
  register(ctx) {
    ctx.registerView({
      id: 'mcp',
      title: 'MCP',
      hotkey: '0',
      component: McpView,
    });
  },
});
