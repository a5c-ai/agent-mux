/**
 * @a5c-ai/agent-mux-harness-mock
 *
 * Mock harness simulator for testing agent-mux adapters.
 * Simulates claude-code, codex, and other CLI harnesses without
 * requiring real installations or API keys.
 *
 * Main components:
 * - MockProcess: simulates a harness subprocess
 * - WorkspaceSandbox: isolated filesystem for file operation testing
 * - Scenarios: pre-built behavior configurations for common test cases
 * - Probe: tools for capturing real harness behavior profiles
 */

// Types
export type {
  HarnessType,
  FileOperation,
  ProcessBehavior,
  OutputChunk,
  StdinInteraction,
  MockEvent,
  HarnessScenario,
  MockHarnessHandle,
  HarnessBehaviorProfile,
} from './types.js';

// Mock process
export { MockProcess } from './mock-process.js';

// Workspace sandbox
export { WorkspaceSandbox } from './workspace.js';
export type { WorkspaceOptions } from './workspace.js';

// Pre-built scenarios
export {
  claudeCodeSuccess,
  claudeCodeToolApproval,
  claudeCodeTimeout,
  claudeCodeCrash,
  claudeCodeFileOps,
  codexSuccess,
  codexFileOps,
  codexFailure,
  emptySuccess,
  slowStartup,
  largeOutput,
} from './scenarios.js';

// Scenario presets: per-agent, interactive, errors + wire-format helpers.
export {
  // resolvers + registries
  resolveScenario,
  listScenarioNames,
  AGENT_SCENARIOS,
  ERROR_SCENARIOS,
  INTERACTION_SCENARIOS,
  // per-agent presets
  claudeBasicText,
  claudeToolCall,
  claudeMultiTurn,
  codexBasicText,
  codexCodeGeneration,
  geminiBasicText,
  geminiStreaming,
  copilotScenarios,
  cursorScenarios,
  opencodeScenarios,
  piScenarios,
  ompScenarios,
  openclawScenarios,
  hermesScenarios,
  // interactive
  buildInteractiveScenario,
  // wire-format
  claudeSystemInit,
  claudeAssistantText,
  claudeToolUse,
  claudeToolResult,
  claudeThinking,
  claudeResult,
  claudeError,
  codexMessage,
  codexFunctionCall,
  codexFunctionCallOutput,
  codexError,
  geminiText,
  geminiToolCall,
  geminiToolResult,
  geminiError,
  genericText,
  genericToolCall,
  genericError,
  stdoutChunk,
  stderrChunk,
} from './scenarios/index.js';
export type { InteractionMode } from './scenarios/interactive.js';
export type { ErrorScenarioMeta } from './scenarios/errors.js';
export type { ToolCall } from './scenarios/wire-format.js';

// Probe tools
export {
  probeHarness,
  probeAllHarnesses,
  compareProfiles,
  PROBE_CONFIGS,
} from './probe.js';
export type {
  ProbeConfig,
  ProbeResult,
  ProfileDiff,
} from './probe.js';
