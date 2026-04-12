import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/agent-mux/blog',
    component: ComponentCreator('/agent-mux/blog', 'b7e'),
    exact: true
  },
  {
    path: '/agent-mux/docs',
    component: ComponentCreator('/agent-mux/docs', '0b7'),
    routes: [
      {
        path: '/agent-mux/docs',
        component: ComponentCreator('/agent-mux/docs', '3d0'),
        routes: [
          {
            path: '/agent-mux/docs',
            component: ComponentCreator('/agent-mux/docs', '48f'),
            routes: [
              {
                path: '/agent-mux/docs',
                component: ComponentCreator('/agent-mux/docs', '028'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/adapter-system',
                component: ComponentCreator('/agent-mux/docs/adapter-system', 'af5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/additional-references',
                component: ComponentCreator('/agent-mux/docs/additional-references', 'a11'),
                exact: true
              },
              {
                path: '/agent-mux/docs/agent-events',
                component: ComponentCreator('/agent-mux/docs/agent-events', '27a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/agent-mux-remote',
                component: ComponentCreator('/agent-mux/docs/agents/agent-mux-remote', '809'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/claude',
                component: ComponentCreator('/agent-mux/docs/agents/claude', '390'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/codex',
                component: ComponentCreator('/agent-mux/docs/agents/codex', '6f0'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/copilot',
                component: ComponentCreator('/agent-mux/docs/agents/copilot', 'c52'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/cursor',
                component: ComponentCreator('/agent-mux/docs/agents/cursor', '856'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/gemini',
                component: ComponentCreator('/agent-mux/docs/agents/gemini', '9de'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/hermes',
                component: ComponentCreator('/agent-mux/docs/agents/hermes', '23b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/omp',
                component: ComponentCreator('/agent-mux/docs/agents/omp', '048'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/openclaw',
                component: ComponentCreator('/agent-mux/docs/agents/openclaw', '06b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/opencode',
                component: ComponentCreator('/agent-mux/docs/agents/opencode', 'ed9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/pi',
                component: ComponentCreator('/agent-mux/docs/agents/pi', 'c62'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/agents/qwen',
                component: ComponentCreator('/agent-mux/docs/agents/qwen', '226'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/babysitter-sdk-parity',
                component: ComponentCreator('/agent-mux/docs/babysitter-sdk-parity', '7c8'),
                exact: true
              },
              {
                path: '/agent-mux/docs/built-in-adapters',
                component: ComponentCreator('/agent-mux/docs/built-in-adapters', '255'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/capabilities-and-models',
                component: ComponentCreator('/agent-mux/docs/capabilities-and-models', '69a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/capabilities-matrix',
                component: ComponentCreator('/agent-mux/docs/capabilities-matrix', 'a89'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/cli-reference',
                component: ComponentCreator('/agent-mux/docs/cli-reference', 'df5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/config-and-auth',
                component: ComponentCreator('/agent-mux/docs/config-and-auth', 'f83'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/core-types-and-client',
                component: ComponentCreator('/agent-mux/docs/core-types-and-client', '6a9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/harness-mock',
                component: ComponentCreator('/agent-mux/docs/harness-mock', '94a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/hooks',
                component: ComponentCreator('/agent-mux/docs/hooks', '7f9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/invocation-modes',
                component: ComponentCreator('/agent-mux/docs/invocation-modes', 'f05'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/plugin-manager',
                component: ComponentCreator('/agent-mux/docs/plugin-manager', '388'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/process-lifecycle-and-platform',
                component: ComponentCreator('/agent-mux/docs/process-lifecycle-and-platform', '203'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/reference-comparison',
                component: ComponentCreator('/agent-mux/docs/reference-comparison', '13b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/run-handle-and-interaction',
                component: ComponentCreator('/agent-mux/docs/run-handle-and-interaction', 'f0e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/run-options-and-profiles',
                component: ComponentCreator('/agent-mux/docs/run-options-and-profiles', 'c8a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/session-manager',
                component: ComponentCreator('/agent-mux/docs/session-manager', 'abe'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/cost-tracking',
                component: ComponentCreator('/agent-mux/docs/tutorials/cost-tracking', '5de'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/docker-mode',
                component: ComponentCreator('/agent-mux/docs/tutorials/docker-mode', 'd07'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/getting-started',
                component: ComponentCreator('/agent-mux/docs/tutorials/getting-started', 'e45'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/hooks',
                component: ComponentCreator('/agent-mux/docs/tutorials/hooks', 'a05'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/k8s-mode',
                component: ComponentCreator('/agent-mux/docs/tutorials/k8s-mode', '93a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/mock-harness',
                component: ComponentCreator('/agent-mux/docs/tutorials/mock-harness', '880'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/multi-agent',
                component: ComponentCreator('/agent-mux/docs/tutorials/multi-agent', 'fc7'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/agent-mux/docs/tutorials/plugins',
                component: ComponentCreator('/agent-mux/docs/tutorials/plugins', '610'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/agent-mux/',
    component: ComponentCreator('/agent-mux/', '0e0'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
