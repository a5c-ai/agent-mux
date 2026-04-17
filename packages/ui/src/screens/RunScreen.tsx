import React from 'react';
import { View } from 'react-native';

import { CostMeter } from '../components/CostMeter.js';
import { EventList } from '../components/EventList.js';
import { InputBar } from '../components/InputBar.js';
import { RunStatusBadge } from '../components/RunStatusBadge.js';
import { useCostTotals } from '../hooks/useCostTotals.js';
import { useRun } from '../hooks/useRun.js';
import { useRunEvents } from '../hooks/useRunEvents.js';
import { useSendInput } from '../hooks/useSendInput.js';

export function RunScreen(props: { runId: string }): JSX.Element {
  const run = useRun(props.runId);
  const events = useRunEvents(props.runId);
  const totals = useCostTotals(props.runId);
  const sendInput = useSendInput();
  return (
    <View>
      <RunStatusBadge status={String(run?.status ?? 'unknown')} />
      <CostMeter totalUsd={totals.totalUsd} />
      <EventList items={events as Array<{ type: string }>} agent={typeof run?.agent === 'string' ? run.agent : undefined} />
      <InputBar onSubmit={(value) => void sendInput(props.runId, value)} />
    </View>
  );
}
