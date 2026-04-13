import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'agent-mux',
  tagline: 'One SDK for every coding agent CLI',
  favicon: 'img/favicon.ico',
  url: 'https://a5c-ai.github.io',
  baseUrl: '/agent-mux/',
  organizationName: 'a5c-ai',
  projectName: 'agent-mux',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/a5c-ai/agent-mux/edit/main/',
        },
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'agent-mux',
      items: [
        { to: '/docs/', label: 'Docs', position: 'left' },
        { href: 'https://github.com/a5c-ai/agent-mux', label: 'GitHub', position: 'right' },
        { href: 'https://www.npmjs.com/package/@a5c-ai/agent-mux', label: 'npm', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} a5c-ai. Built with Docusaurus.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
