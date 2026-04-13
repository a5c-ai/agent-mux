import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
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
  const [cursor, setCursor] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const mgr = new HookConfigManager();
      const list = await mgr.list();
      const mapped = list.map((h) => ({
        id: h.id,
        hookType: h.hookType,
        handler: h.handler,
        target: h.target,
        enabled: h.enabled,
        priority: h.priority,
      }));
      setRows(mapped);
      setCursor((c) => Math.min(c, Math.max(mapped.length - 1, 0)));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
  }, [active, refresh]);

  useInput((input, key) => {
    if (!active) return;
    if (confirmDelete) {
      if (input === 'y' || input === 'Y') {
        const row = rows[cursor];
        if (row) {
          (async () => {
            try {
              const mgr = new HookConfigManager();
              await mgr.remove(row.id);
              setStatus(`Removed ${row.id}`);
              refresh();
            } catch (e) {
              setStatus(`Remove failed: ${String(e)}`);
            }
          })();
        }
        setConfirmDelete(false);
      } else if (input === 'n' || input === 'N' || key.escape) {
        setConfirmDelete(false);
        setStatus('Cancelled');
      }
      return;
    }
    if (key.downArrow || input === 'j') setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0)));
    else if (key.upArrow || input === 'k') setCursor((c) => Math.max(c - 1, 0));
    else if (input === 'r') refresh();
    else if (input === 'd' && rows[cursor]) setConfirmDelete(true);
  }, { isActive: active });

  if (error) return <Text color="red">{error}</Text>;
  if (rows.length === 0) return <Text dimColor>No hooks registered. Use `amux hooks &lt;agent&gt; add` to register.</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>Hooks</Text>
      <Text dimColor>j/k or arrows: move · d: remove · r: refresh · (amux hooks &lt;agent&gt; &lt;discover|list|add|remove|set&gt;)</Text>
      {rows.slice(0, 40).map((r, i) => {
        const sel = i === cursor;
        return (
          <Text key={r.id + ':' + i} color={sel ? 'green' : undefined}>
            {sel ? '> ' : '  '}
            <Text color="cyan">{r.id.padEnd(20)}</Text>{' '}
            <Text>{r.hookType.padEnd(18)}</Text>{' '}
            <Text color="gray">{r.handler.padEnd(8)}</Text>{' '}
            {r.target ? <Text dimColor>{r.target}</Text> : null}
            {r.enabled === false ? <Text color="gray"> (disabled)</Text> : null}
          </Text>
        );
      })}
      {rows.length > 40 ? <Text dimColor>… {rows.length - 40} more</Text> : null}
      {confirmDelete && rows[cursor] ? (
        <Text color="yellow">Remove hook {rows[cursor]!.id}? (y/n)</Text>
      ) : null}
      {status ? <Text dimColor>{status}</Text> : null}
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
