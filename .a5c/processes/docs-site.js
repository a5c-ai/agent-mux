/**
 * @process docs-site
 * @description Flesh out Docusaurus site + per-adapter usage docs + GitHub Pages deployment.
 *
 * Status: scaffold in place (website/, docs/README.md, .github/workflows/docs.yml).
 * This process fills in per-adapter pages, tutorial pages, and verifies the build.
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

const perAdapterDocsTask = defineTask('per-adapter-docs', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write docs/02-agents/<adapter>.md for all adapters',
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical writer',
      task: 'Create one markdown page per adapter under docs/02-agents/ covering install, auth, `amux run <agent>` example, flags, session file location, MCP plugin status, and limitations.',
      context: { adapters: args.adapters },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const tutorialsTask = defineTask('tutorials', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write tutorial pages',
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical writer',
      task: 'Write docs/tutorials/{getting-started,mock-harness,docker-mode,k8s-mode,hooks,plugins,multi-agent}.md with runnable examples.',
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

const buildTask = defineTask('verify-build', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Verify Docusaurus build',
  execution: { model: 'claude-opus-4-6' },
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'DevOps',
      task: 'cd website && npm install && npm run build. Fix any broken links or missing sidebars entries.',
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

export default async function docsSite(ctx) {
  const adapters = ['claude','codex','cursor','gemini','opencode','openclaw','copilot','hermes','pi','omp','agent-mux-remote'];
  await ctx.run(perAdapterDocsTask, { adapters });
  await ctx.run(tutorialsTask, {});
  await ctx.run(buildTask, {});
  return { ok: true };
}
