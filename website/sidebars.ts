import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

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
      ],
    },
    {
      type: 'category',
      label: 'Core',
      items: [
        '01-core-types-and-client',
        '02-run-options-and-profiles',
        '03-run-handle-and-interaction',
        '04-agent-events',
      ],
    },
    {
      type: 'category',
      label: 'Adapters',
      items: [
        '05-adapter-system',
        '06-capabilities-and-models',
        '12-built-in-adapters',
      ],
    },
    {
      type: 'category',
      label: 'Agents',
      items: [
        '02-agents/claude',
        '02-agents/codex',
        '02-agents/cursor',
        '02-agents/gemini',
        '02-agents/opencode',
        '02-agents/openclaw',
        '02-agents/copilot',
        '02-agents/hermes',
        '02-agents/pi',
        '02-agents/omp',
        '02-agents/agent-mux-remote',
        '02-agents/qwen',
      ],
    },
    {
      type: 'category',
      label: 'Sessions & Config',
      items: ['07-session-manager', '08-config-and-auth'],
    },
    {
      type: 'category',
      label: 'Runtime',
      items: [
        '10-cli-reference',
        '11-process-lifecycle-and-platform',
        '13-invocation-modes',
        '14-harness-mock',
      ],
    },
    {
      type: 'category',
      label: 'Extensibility',
      items: ['09-plugin-manager', '15-hooks'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['16-reference-comparison'],
    },
  ],
};

export default sidebars;
