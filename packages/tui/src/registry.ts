import type { AgentMuxClient } from '@a5c-ai/agent-mux';
import type {
  EventRenderer,
  TuiCommand,
  TuiContext,
  TuiInternalEvent,
  TuiPlugin,
  TuiView,
} from './plugin.js';

export interface Registry {
  views: TuiView[];
  renderers: EventRenderer[];
  commands: TuiCommand[];
}

export function createRegistry(): Registry {
  return { views: [], renderers: [], commands: [] };
}

export function createContext(
  client: AgentMuxClient,
  registry: Registry,
  emit: (e: TuiInternalEvent) => void,
): TuiContext {
  return {
    client,
    registerView: (v) => registry.views.push(v),
    registerEventRenderer: (r) => registry.renderers.push(r),
    registerCommand: (c) => registry.commands.push(c),
    emit,
  };
}

export async function loadPlugins(
  plugins: TuiPlugin[],
  ctx: TuiContext,
): Promise<void> {
  for (const p of plugins) {
    await p.register(ctx);
  }
}
