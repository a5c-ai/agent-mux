import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Observability Integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should switch between modes based on env var', async () => {
    // Use doMock to avoid hoisting
    vi.doMock('./logger.js', () => ({
      logger: { name: 'real-logger' },
      createLogger: () => ({ name: 'real-logger' }),
      createComponentLogger: () => ({ name: 'real-logger' }),
    }));
    vi.doMock('./logger-simple.js', () => ({
      logger: { name: 'simple-logger' },
      createSimpleLogger: () => ({ name: 'simple-logger' }),
      createComponentLogger: () => ({ name: 'simple-logger' }),
    }));
    vi.doMock('./telemetry.js', () => ({
      telemetry: { name: 'real-telemetry' },
      initializeTelemetry: vi.fn(),
      shutdownTelemetry: vi.fn(),
    }));
    vi.doMock('./telemetry-simple.js', () => ({
      telemetry: { name: 'simple-telemetry' },
      initializeTelemetry: vi.fn(),
      shutdownTelemetry: vi.fn(),
    }));

    // Test simple mode
    process.env.AMUX_OBSERVABILITY_MODE = 'simple';
    const { logger: loggerSimple, telemetry: telemetrySimple } = await import('./index.js');
    expect((loggerSimple as any).name).toBe('simple-logger');
    expect((telemetrySimple as any).name).toBe('simple-telemetry');

    // Reset modules to reload index.js with new env var
    vi.resetModules();
    process.env.AMUX_OBSERVABILITY_MODE = 'full';
    const { logger: loggerFull, telemetry: telemetryFull } = await import('./index.js');
    expect((loggerFull as any).name).toBe('real-logger');
    expect((telemetryFull as any).name).toBe('real-telemetry');
  });
});
