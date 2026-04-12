import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// Note: Docusaurus defaults to numberPrefixParser=true, so files like
// `01-core-types-and-client.md` are exposed as id `core-types-and-client`.
// Directories are stripped the same way (`02-agents/` -> `agents/`).

const sidebars: SidebarsConfig = {
  docs: [
    'README',
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/getting-started',
        'tutorials/mock-harness',
        'tutorials/docker-mode',
        'tutorials/k8s-mode',
        'tutorials/hooks',
        'tutorials/plugins',
        'tutorials/multi-agent',
        'tutorials/cost-tracking',
      ],
    },
    {
      type: 'category',
      label: 'Core',
      items: [
        'core-types-and-client',
        'run-options-and-profiles',
        'run-handle-and-interaction',
        'agent-events',
      ],
    },
    {
      type: 'category',
      label: 'Adapters',
      items: [
        'adapter-system',
        'capabilities-and-models',
        'built-in-adapters',
      ],
    },
    {
      type: 'category',
      label: 'Agents',
      items: [
        'agents/claude',
        'agents/codex',
        'agents/cursor',
        'agents/gemini',
        'agents/opencode',
        'agents/openclaw',
        'agents/copilot',
        'agents/hermes',
        'agents/pi',
        'agents/omp',
        'agents/agent-mux-remote',
        'agents/qwen',
      ],
    },
    {
      type: 'category',
      label: 'Sessions & Config',
      items: ['session-manager', 'config-and-auth'],
    },
    {
      type: 'category',
      label: 'Runtime',
      items: [
        'cli-reference',
        'process-lifecycle-and-platform',
        'invocation-modes',
        'harness-mock',
      ],
    },
    {
      type: 'category',
      label: 'Extensibility',
      items: ['plugin-manager', 'hooks'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference-comparison', 'capabilities-matrix'],
    },
  ],
};

export default sidebars;
