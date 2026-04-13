/**
 * Simple structured logging for agent-mux.
 * Provides basic logging capabilities without complex dependencies.
 */

/**
 * Log levels supported by the system.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Contextual information that can be attached to log entries.
 */
export interface LogContext {
  /** Run ID for correlating logs across a single run */
  runId?: string;
  /** Agent name being used */
  agent?: string;
  /** Session ID for multi-turn conversations */
  sessionId?: string;
  /** Model being used */
  model?: string;
  /** Component or module name */
  component?: string;
  /** Duration in milliseconds for performance tracking */
  duration?: number;
  /** Additional arbitrary metadata */
  [key: string]: unknown;
}

/**
 * Cost information structure
 */
export interface CostInfo {
  totalUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
}

/**
 * Simple logger interface with agent-mux specific methods.
 */
export interface Logger {
  // Core logging methods - support both string and object patterns
  trace(msg: string): void;
  trace(obj: object, msg?: string): void;
  debug(msg: string): void;
  debug(obj: object, msg?: string): void;
  info(msg: string): void;
  info(obj: object, msg?: string): void;
  warn(msg: string): void;
  warn(obj: object, msg?: string): void;
  error(msg: string): void;
  error(obj: object, msg?: string): void;
  fatal(msg: string): void;
  fatal(obj: object, msg?: string): void;

  /** Create a child logger with additional context */
  child(context: LogContext): Logger;

  /** Log agent run start */
  runStart(context: { runId: string; agent: string; prompt: string; model?: string }): void;

  /** Log agent run completion */
  runComplete(context: { runId: string; agent: string; duration: number; cost?: CostInfo }): void;

  /** Log agent run error */
  runError(context: { runId: string; agent: string; error: Error | { message: string; name?: string } }): void;

  /** Log tool call start */
  toolCallStart(context: { runId: string; toolName: string; toolCallId: string; args?: unknown }): void;

  /** Log tool call completion */
  toolCallComplete(context: { runId: string; toolName: string; toolCallId: string; duration: number; result?: unknown }): void;

  /** Log session events */
  session(message: string, context: LogContext & { action?: 'create' | 'resume' | 'fork' | 'end' }): void;
}

/**
 * Simple logger implementation.
 */
class SimpleLogger implements Logger {
  private baseContext: LogContext;

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