import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ModelOption {
  agent: string;
  modelId: string;
}

export interface ModelPickerProps {
  models: ModelOption[];
  onPick(option: ModelOption): void;
  onCancel(): void;
}

export function ModelPicker({ models, onPick, onCancel }: ModelPickerProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const filtered = query
    ? models.filter(
        (m) =>
          m.modelId.toLowerCase().includes(query.toLowerCase()) ||
          m.agent.toLowerCase().includes(query.toLowerCase()),
      )
    : models;

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
        <Text color="cyan">model: </Text>
        <Text>{query}</Text>
        <Text color="cyan">▌</Text>
      </Box>
      {filtered.length === 0 ? (
        <Text dimColor>(no matches)</Text>
      ) : (
        filtered.slice(0, 8).map((m, i) => {
          const sel = i === cursor;
          return (
            <Text key={m.agent + ':' + m.modelId} color={sel ? 'green' : undefined}>
              {sel ? '> ' : '  '}
              <Text color="cyan">{m.agent}</Text> {m.modelId}
            </Text>
          );
        })
      )}
    </Box>
  );
}
