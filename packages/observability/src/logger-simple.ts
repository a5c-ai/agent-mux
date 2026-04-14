/**
 * Simple structured logging for agent-mux.
 * Provides basic logging capabilities without complex dependencies.
 */

import { Logger, LogLevel, LogContext, CostInfo } from './types.js';

/**
 * Simple logger implementation.
 */
class SimpleLogger implements Logger {
  private baseContext: LogContext;
  public level: string = 'info';

  constructor(baseContext: LogContext = {}) {
    this.baseContext = baseContext;
  }

  private log(level: LogLevel, msgOrObj: string | object, msg?: string): void {
    const timestamp = new Date().toISOString();

    let message: string;
    let context: LogContext;

    if (typeof msgOrObj === 'string') {
      message = msgOrObj;
      context = {};
    } else {
      message = msg || 'Log message';
      context = msgOrObj as LogContext;
    }

    const mergedContext = { ...this.baseContext, ...context };

    const logEntry = {
      timestamp,
      level,
      msg: message,
      ...mergedContext,
    };

    console.log(JSON.stringify(logEntry));
  }

  trace(msgOrObj: string | object, msg?: string): void {
    this.log('trace', msgOrObj, msg);
  }

  debug(msgOrObj: string | object, msg?: string): void {
    this.log('debug', msgOrObj, msg);
  }

  info(msgOrObj: string | object, msg?: string): void {
    this.log('info', msgOrObj, msg);
  }

  warn(msgOrObj: string | object, msg?: string): void {
    this.log('warn', msgOrObj, msg);
  }

  error(msgOrObj: string | object, msg?: string): void {
    this.log('error', msgOrObj, msg);
  }

  fatal(msgOrObj: string | object, msg?: string): void {
    this.log('fatal', msgOrObj, msg);
  }

  child(context: LogContext): Logger {
    return new SimpleLogger({ ...this.baseContext, ...context });
  }

  runStart(context: { runId: string; agent: string; prompt: string; model?: string }): void {
    this.info({
      runId: context.runId,
      agent: context.agent,
      model: context.model,
      prompt: context.prompt.slice(0, 100) + (context.prompt.length > 100 ? '...' : ''),
    }, 'Agent run started');
  }

  runComplete(context: { runId: string; agent: string; duration: number; cost?: CostInfo }): void {
    this.info({
      runId: context.runId,
      agent: context.agent,
      duration: context.duration,
      cost: context.cost,
    }, 'Agent run completed');
  }

  runError(context: { runId: string; agent: string; error: Error | { message: string; name?: string } }): void {
    const error = context.error instanceof Error ? {
      message: context.error.message,
      stack: context.error.stack,
      name: context.error.name,
    } : context.error;

    this.error({
      runId: context.runId,
      agent: context.agent,
      error,
    }, 'Agent run failed');
  }

  toolCallStart(context: { runId: string; toolName: string; toolCallId: string; args?: unknown }): void {
    this.debug({
      runId: context.runId,
      toolName: context.toolName,
      toolCallId: context.toolCallId,
      args: context.args,
    }, 'Tool call started');
  }

  toolCallComplete(context: { runId: string; toolName: string; toolCallId: string; duration: number; result?: unknown }): void {
    this.debug({
      runId: context.runId,
      toolName: context.toolName,
      toolCallId: context.toolCallId,
      duration: context.duration,
      result: typeof context.result === 'string' ? context.result.slice(0, 200) : context.result,
    }, 'Tool call completed');
  }

  session(message: string, context: LogContext & { action?: 'create' | 'resume' | 'fork' | 'end' }): void {
    this.info({
      ...context,
      type: 'session',
    }, message);
  }
}

/**
 * Create a simple logger instance.
 */
export function createSimpleLogger(baseContext?: LogContext): Logger {
  return new SimpleLogger(baseContext);
}

/**
 * Default logger instance.
 */
export const logger = createSimpleLogger({
  service: 'agent-mux',
  version: process.env.npm_package_version || 'unknown',
});

/**
 * Create a logger for a specific component.
 */
export function createComponentLogger(component: string, context?: LogContext): Logger {
  return logger.child({ component, ...context });
}