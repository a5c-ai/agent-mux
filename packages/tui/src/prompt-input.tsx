import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PromptInputProps {
  onSubmit: (value: string) => void;
  onCancel: () => void;
  label?: string;
}

export function PromptInput({ onSubmit, onCancel, label = 'prompt> ' }: PromptInputProps) {
  const [value, setValue] = useState('');
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input);
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
