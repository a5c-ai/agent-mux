/**
 * @process integrate-harness
 * @description Research, scaffold, test, and document a new agent-harness adapter for @a5c-ai/agent-mux.
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

const researchTask = defineTask('research-harness', (args, taskCtx) => ({
  kind: 'agent',
  title: `Research harness: ${args.harness}`,
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer researching a new agent-CLI harness for integration',
      task: `Research the "${args.harness}" harness. Produce structured notes covering install, session format, auth, streaming events, hooks, plugins, and limitations.`,
      context: { harness: args.harness, docsUrls: args.docsUrls || [], repoUrl: args.repoUrl || null },
      instructions: [
        'Fetch the harness CLI docs and help output.',
        'Document: install command, version flag, session file path and format (JSONL/JSON/SQLite), auth flow (env var / OAuth / browser), streaming JSONL event types, native hook support, MCP plugin support, known limitations.',
        'Return JSON matching outputSchema.',
      ],
      outputFormat: 'JSON',
    },
    outputSchema: {
      type: 'object',
      required: ['install', 'session', 'auth', 'events', 'hooks', 'plugins', 'limitations'],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const scaffoldTask = defineTask('scaffold-adapter', (args, taskCtx) => ({
  kind: 'agent',
  title: `Scaffold ${args.harness}-adapter.ts`,
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'TypeScript developer implementing a BaseAgentAdapter subclass',
      task: `Create packages/adapters/src/${args.harness}-adapter.ts extending BaseAgentAdapter.`,
      context: { harness: args.harness, research: args.research, projectRoot: args.projectRoot },
      instructions: [
        'Read packages/adapters/src/claude-adapter.ts as the canonical template.',
        'Fill AgentCapabilities from research notes — conservative defaults for unknowns.',
        'Implement buildSpawnArgs, parseEvent, detectAuth, getAuthGuidance, sessionDir, parseSessionFile, listSessionFiles, readConfig, writeConfig.',
        'If the harness supports MCP plugins, delegate to mcp-plugins.ts (see cursor-adapter.ts pattern).',
        'Keep file under 400 effective lines — split helpers if needed.',
        'Register the adapter in packages/adapters/src/index.ts.',
      ],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const testTask = defineTask('test-adapter', (args, taskCtx) => ({
  kind: 'agent',
  title: `Test ${args.harness}-adapter`,
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'TypeScript test engineer writing adapter test coverage',
      task: `Write packages/adapters/tests/${args.harness}-adapter.test.ts with full coverage.`,
      context: { harness: args.harness },
      instructions: [
        'Cover capability shape, buildSpawnArgs for representative RunOptions, parseEvent for every JSONL type, detectAuth authenticated + unauthenticated, session file parsing from a redacted fixture.',
        'If MCP plugin support, add the adapter to packages/adapters/tests/mcp-plugins-parity.test.ts.',
        'Run: npm run typecheck && npm run lint && npm test. Must all pass.',
      ],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const docsTask = defineTask('document-adapter', (args, taskCtx) => ({
  kind: 'agent',
  title: `Docs + changeset for ${args.harness}`,
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Docs author',
      task: `Add README matrix row, docs/02-agents/${args.harness}.md, and a changeset entry.`,
      context: { harness: args.harness },
      instructions: [
        'Append a row to the capability matrix in README.md.',
        'Write docs/02-agents/<harness>.md with install, auth, example run, limitations.',
        'npm run changeset — minor — summarize "add <harness> adapter".',
      ],
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

export default async function integrateHarness(ctx) {
  const harness = ctx.inputs.harness;
  const projectRoot = ctx.inputs.projectRoot || process.cwd();

  const research = await ctx.run(researchTask, {
    harness,
    docsUrls: ctx.inputs.docsUrls,
    repoUrl: ctx.inputs.repoUrl,
  });

  await ctx.run(scaffoldTask, { harness, research, projectRoot });
  await ctx.run(testTask, { harness });
  await ctx.run(docsTask, { harness });

  return { ok: true, harness };
}
