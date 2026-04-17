import React from 'react';
import { View } from 'react-native';

import { classifyTool } from '../../../../core/src/tools/index.js';
import type { AgentName } from '../../../../core/src/types.js';

import { Card } from '../primitives/Card.js';
import { Text } from '../primitives/Text.js';
import { registerBuiltInToolCallRenderers } from './builtins.js';
import { resolveToolCallRenderer } from './registry.js';

export function ToolResultCard(props: {
  agent: AgentName;
  toolName: string;
  input?: unknown;
  output?: unknown;
}): JSX.Element {
  registerBuiltInToolCallRenderers();
  const renderer = resolveToolCallRenderer(props.agent, props.toolName, props.input);
  const classification = classifyTool(props.agent, props.toolName, props.input);
  return (
    <Card>
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: '700' }}>{props.toolName}</Text>
        {renderer.expanded({
          agent: props.agent,
          toolName: props.toolName,
          input: props.input,
          output: props.output,
          classification,
        })}
      </View>
    </Card>
  );
}
