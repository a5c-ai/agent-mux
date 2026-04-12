import { describe, it, expect, vi } from 'vitest';

// Mock child_process before importing the module
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

import { detectAgentCapabilities } from '../../src/lib/agent-capabilities.js';

describe('agent capabilities detection', () => {
  it('should detect claude plugin support', async () => {
    const { exec } = await import('child_process');
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      callback?.(null, { stdout: '', stderr: '' });
    });

    const capabilities = await detectAgentCapabilities('claude');

    expect(capabilities.supportsPlugins).toBe(true);
    expect(capabilities.pluginCommands).toEqual(['list', 'install', 'enable', 'disable', 'marketplace']);
    expect(mockExec).toHaveBeenCalledWith('claude plugins --help', expect.objectContaining({ timeout: 5000 }), expect.any(Function));
  });

  it('should detect no plugin support for unsupported agents', async () => {
    const { exec } = await import('child_process');
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      callback?.(new Error('command not found'));
    });

    const capabilities = await detectAgentCapabilities('nonexistent');

    expect(capabilities.supportsPlugins).toBe(false);
    expect(capabilities.pluginCommands).toEqual([]);
  });
});