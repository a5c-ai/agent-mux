import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { TuiCommand, TuiView } from './plugin.js';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run(): void | Promise<void>;
}

export interface CommandPaletteProps {
  views: TuiView[];
  commands: TuiCommand[];
  onPick(action: PaletteAction): void;
  onCancel(): void;
}

function buildActions(views: TuiView[], commands: TuiCommand[]): PaletteAction[] {
  const actions: PaletteAction[] = [];
  for (const v of views) {
    actions.push({
      id: 'view:' + v.id,
      label: 'view: ' + v.title,
      hint: v.hotkey ? `hotkey ${v.hotkey}` : undefined,
      run: () => {},
    });
  }
  for (const c of commands) {
    actions.push({
      id: 'cmd:' + c.id,
      label: 'cmd: ' + c.label,
      hint: `hotkey ${c.hotkey}`,
      run: () => {},
    });
  }
  return actions;
}

export function CommandPalette({ views, commands, onPick, onCancel }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const all = buildActions(views, commands);
  const filtered = query
    ? all.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : all;

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      const pick = filtered[cursor];
      if (pick) onPick(pick);
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(c + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (key.backspace || key.delete) {
      setQuery((q) => q.slice(0, -1));
      setCursor(0);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setQuery((q) => q + input);
      setCursor(0);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Box>
        <Text color="cyan">: </Text>
        <Text>{query}</Text>
        <Text color="cyan">▌</Text>
      </Box>
      {filtered.length === 0 ? (
        <Text dimColor>(no matches)</Text>
      ) : (
        filtered.slice(0, 8).map((a, i) => {
          const sel = i === cursor;
          return (
            <Text key={a.id} color={sel ? 'green' : undefined}>
              {sel ? '> ' : '  '}
              {a.label}
              {a.hint ? <Text dimColor> {a.hint}</Text> : null}
            </Text>
          );
        })
      )}
    </Box>
  );
}
