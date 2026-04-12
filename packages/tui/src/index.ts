export { App } from './app.js';
export { createRegistry, createContext, loadPlugins } from './registry.js';
export type { Registry } from './registry.js';
export * from './plugin.js';

import textDelta from './plugins/text-delta.js';
import toolCall from './plugins/tool-call.js';
import cost from './plugins/cost.js';
import chatView from './plugins/chat-view.js';
import sessionsView from './plugins/sessions-view.js';
import type { TuiPlugin } from './plugin.js';

export const builtinPlugins: TuiPlugin[] = [
  textDelta,
  toolCall,
  cost,
  chatView,
  sessionsView,
];
