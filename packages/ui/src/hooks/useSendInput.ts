import { useGateway } from './useGateway.js';

export function useSendInput() {
  const { client } = useGateway();
  return async (runId: string, input: string) => {
    return await client.request({
      type: 'run.input',
      runId,
      input,
    });
  };
}
