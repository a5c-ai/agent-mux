export { App } from './app.js';
export { createRegistry, createContext, loadPlugins } from './registry.js';
export type { Registry } from './registry.js';
export { EventStream } from './event-stream.js';
export type { EventSubscriber, Unsubscribe } from './event-stream.js';
export { PromptInput } from './prompt-input.js';
export * from './plugin.js';

import textDelta from './plugins/text-delta.js';
import toolCall from './plugins/tool-call.js';
import cost from './plugins/cost.js';
import chatView from './plugins/chat-view.js';
import sessionsView from './plugins/sessions-view.js';
import costView from './plugins/cost-view.js';
import fallback from './plugins/fallback.js';
import diff from './plugins/diff.js';
import shell from './plugins/shell.js';
import mcp from './plugins/mcp.js';
import subagent from './plugins/subagent.js';
import fileOps from './plugins/file-ops.js';
import sessionLifecycle from './plugins/session-lifecycle.js';
import approval from './plugins/approval.js';
import type { TuiPlugin } from './plugin.js';

// Order matters: specific renderers first, fallback LAST so it only matches
// when nothing else did (chat-view's pickRenderers enforces this).
export const builtinPlugins: TuiPlugin[] = [
  textDelta,
  toolCall,
  diff,
  shell,
  mcp,
  subagent,
  fileOps,
  sessionLifecycle,
  approval,
  cost,
  chatView,
  sessionsView,
  costView,
  fallback,
];
