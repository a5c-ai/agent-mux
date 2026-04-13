/**
 * Simple telemetry for agent-mux.
 * Provides basic metrics and tracing without OpenTelemetry dependencies.
 */

/**
 * Simple metrics interface.
 */
export interface SimpleTelemetry {
  /** Record agent run start */
  recordRunStart(agent: string, model?: string): void;

  /** Record agent run completion */
  recordRunComplete(agent: string, model: string | undefined, duration: number): void;

  /** Record agent run error */
  recordRunError(agent: string, model: string | undefined, error: Error | string): void;

  /** Record tool call */
  recordToolCall(toolName: string, duration: number, success: boolean): void;

  /** Record authentication event */
  recordAuthEvent(agent: string, method: string, success: boolean): void;
}

/**
 * Simple telemetry implementation that logs metrics.
 */
class SimpleTelemetryImpl implements SimpleTelemetry {
  recordRunStart(agent: string, model?: string): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'run_start',
      agent,
      model: model || 'unknown',
    }));
  }

  recordRunComplete(agent: string, model: string | undefined, duration: number): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'run_complete',
      agent,
      model: model || 'unknown',
      duration,
    }));
  }

  recordRunError(agent: string, model: string | undefined, error: Error | string): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'run_error',
      agent,
      model: model || 'unknown',
      error_type: error instanceof Error ? error.constructor.name : 'unknown',
      error_message: error instanceof Error ? error.message : error,
    }));
  }

  recordToolCall(toolName: string, duration: number, success: boolean): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'tool_call',
      tool: toolName,
      duration,
      status: success ? 'success' : 'error',
    }));
  }

  recordAuthEvent(agent: string, method: string, success: boolean): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'auth_event',
      agent,
      method,
      status: success ? 'success' : 'failure',
    }));
  }
}

/**
 * Default telemetry instance.
 */
export const telemetry = new SimpleTelemetryImpl();

/**
 * Initialize telemetry (no-op for simple implementation).
 */
export function initializeTelemetry(): void {
  // No-op for simple implementation
}

/**
 * Shutdown telemetry (no-op for simple implementation).
 */
export async function shutdownTelemetry(): Promise<void> {
  // No-op for simple implementation
}