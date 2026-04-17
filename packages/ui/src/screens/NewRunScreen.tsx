import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AgentPicker } from '../components/AgentPicker.js';
import { InputBar } from '../components/InputBar.js';
import { useAgents } from '../hooks/useAgents.js';
import { useStartRun } from '../hooks/useStartRun.js';

export function NewRunScreen(props: { onStarted?: (runId: string) => void } = {}): JSX.Element {
  const agents = useAgents();
  const [agent, setAgent] = useState<string | undefined>(agents[0]);
  const startRun = useStartRun();

  useEffect(() => {
    if (!agent && agents.length > 0) {
      setAgent(agents[0]);
      return;
    }
    if (agent && !agents.includes(agent) && agents.length > 0) {
      setAgent(agents[0]);
    }
  }, [agent, agents]);

  return (
    <View>
      <AgentPicker agents={agents} selected={agent} onSelect={setAgent} />
      <InputBar onSubmit={async (prompt) => {
        if (!agent || !prompt.trim()) {
          return;
        }
        const response = await startRun({ agent, prompt });
        const run = response['run'] as Record<string, unknown> | undefined;
        if (typeof run?.['runId'] === 'string') {
          props.onStarted?.(run['runId']);
        }
      }} />
    </View>
  );
}
