import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PromptInputProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  label?: string;
  /** Optional prior submissions for up/down recall (most recent last). */
  history?: string[];
}

export function PromptInput({
  onSubmit,
  onCancel,
  label = 'prompt> ',
  history,
}: PromptInputProps) {
  const [value, setValue] = useState('');
  // -1 = current draft; 0..history.length-1 = recalled entry (0 = most recent)
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [draft, setDraft] = useState<string>('');

  function recall(direction: 'up' | 'down') {
    if (!history || history.length === 0) return;
    if (direction === 'up') {
      const next = histIdx + 1;
      if (next >= history.length) return;
      if (histIdx === -1) setDraft(value);
      const recalled = history[history.length - 1 - next] ?? '';
      setHistIdx(next);
      setValue(recalled);
    } else {
      const next = histIdx - 1;
      if (next < -1) return;
      setHistIdx(next);
      setValue(next === -1 ? draft : history[history.length - 1 - next] ?? '');
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.upArrow) {
      recall('up');
      return;
    }
    if (key.downArrow) {
      recall('down');
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      setHistIdx(-1);
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input);
      setHistIdx(-1);
    }
  });
  return (
    <Box>
      <Text color="cyan">{label}</Text>
      <Text>{value}</Text>
      <Text color="cyan">▌</Text>
    </Box>
  );
}
