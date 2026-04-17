import { useGateway } from './useGateway.js';

export function useStartRun() {
  const { client, store } = useGateway();
  return async (input: Record<string, unknown>) => {
    const response = await client.request<Record<string, unknown>, Record<string, unknown>>({
      type: 'run.start',
      ...input,
    });
    const run = response['run'] as Record<string, unknown> | undefined;
    const runId = typeof run?.['runId'] === 'string' ? run['runId'] : null;
    if (run && runId) {
      store.getState().actions.mergeRun(runId, run);
      client.subscribeRun(runId);
    }
    return response;
  };
}
