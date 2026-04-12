import { describe, it, expect, vi } from 'vitest';

const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
vi.doMock('child_process', () => ({ exec: mockExec }));

import { detectAgentCapabilities } from '../../src/lib/agent-capabilities.js';

describe('agent capabilities detection', () => {
  it('should detect claude plugin support', async () => {
    mockExec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    const capabilities = await detectAgentCapabilities('claude');

    expect(capabilities.supportsPlugins).toBe(true);
    expect(capabilities.pluginCommands).toEqual(['list', 'install', 'enable', 'disable', 'marketplace', 'uninstall', 'update']);
    expect(capabilities.nativePluginCommand).toBe('claude plugins');
  });

  it('should detect no plugin support for unsupported agents', async () => {
    mockExec.mockRejectedValue(new Error('command not found'));

    const capabilities = await detectAgentCapabilities('nonexistent');

    expect(capabilities.supportsPlugins).toBe(false);
    expect(capabilities.pluginCommands).toEqual([]);
    expect(capabilities.nativePluginCommand).toBe('');
  });
});