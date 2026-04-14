const fs = require('fs');

let sessionFs = fs.readFileSync('packages/adapters/src/session-fs.ts', 'utf8');
const rootCode = `
import * as syncFs from 'node:fs';

export function findProjectRootSync(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (
      syncFs.existsSync(path.join(current, '.git')) ||
      syncFs.existsSync(path.join(current, '.a5c')) ||
      syncFs.existsSync(path.join(current, '.claude.json')) ||
      syncFs.existsSync(path.join(current, '.claude'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}
`;
if (!sessionFs.includes('findProjectRootSync')) {
  sessionFs = sessionFs.replace('export async function listFilesRecursive', rootCode + '\nexport async function listFilesRecursive');
  fs.writeFileSync('packages/adapters/src/session-fs.ts', sessionFs);
}

// Update mcp-plugins.ts to support string | string[]
let mcpPlugins = fs.readFileSync('packages/adapters/src/mcp-plugins.ts', 'utf8');
mcpPlugins = mcpPlugins.replace(
  'export async function mcpListPlugins(configPath: string): Promise<InstalledPlugin[]> {',
  'export async function mcpListPlugins(configPath: string | string[]): Promise<InstalledPlugin[]> {'
);
mcpPlugins = mcpPlugins.replace(
  'const doc = await readConfig(configPath);',
  `const paths = Array.isArray(configPath) ? configPath : [configPath];
  const allServers = {};
  for (const p of paths) {
    const doc = await readConfig(p);
    const servers = doc['mcpServers'] && typeof doc['mcpServers'] === 'object'
      ? doc['mcpServers']
      : {};
    for (const [id, def] of Object.entries(servers)) {
      allServers[id] = def;
    }
  }
  const doc = { mcpServers: allServers };`
);
fs.writeFileSync('packages/adapters/src/mcp-plugins.ts', mcpPlugins);

// Update claude-adapter.ts
let claudeAdapter = fs.readFileSync('packages/adapters/src/claude-adapter.ts', 'utf8');
if (!claudeAdapter.includes('findProjectRootSync')) {
  claudeAdapter = claudeAdapter.replace(
    "import {\n  listJsonlFiles,\n  parseJsonlSessionFile,\n  readJsonFile,\n  writeJsonFileAtomic,\n} from './session-fs.js';",
    "import {\n  findProjectRootSync,\n  listJsonlFiles,\n  parseJsonlSessionFile,\n  readJsonFile,\n  writeJsonFileAtomic,\n} from './session-fs.js';"
  );
  claudeAdapter = claudeAdapter.replace(
    '  private settingsPath(): string {\n    return path.join(os.homedir(), \'.claude\', \'settings.json\');\n  }',
    `  private settingsPath(): string {
    return path.join(os.homedir(), '.claude', 'settings.json');
  }

  private projectSettingsPath(): string {
    return path.join(findProjectRootSync(), '.claude', 'settings.json');
  }`
  );
  claudeAdapter = claudeAdapter.replace(
    '  override async listPlugins(): Promise<InstalledPlugin[]> {\n    return mcpListPlugins(this.settingsPath());\n  }',
    '  override async listPlugins(): Promise<InstalledPlugin[]> {\n    return mcpListPlugins([this.settingsPath(), this.projectSettingsPath()]);\n  }'
  );
  // Optional: update install/uninstall to target project setting if needed, but the prompt says
  // "plugins not showing... also include global/repo local distinction". 
  // Wait, if amux mcp list claude uses `ConfigManager`, I need to fix `ConfigManager`!
  fs.writeFileSync('packages/adapters/src/claude-adapter.ts', claudeAdapter);
}
