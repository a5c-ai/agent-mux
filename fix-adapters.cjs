const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:', 'work', 'agent-mux', 'packages', 'adapters', 'src');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('-adapter.ts') && f !== 'base-adapter.ts' && f !== 'agent-mux-remote-adapter.ts');

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the 'buildSpawnArgs(options: RunOptions): SpawnArgs {'
  if (!content.includes('buildSpawnArgs(')) continue;

  let changed = false;

  // Pattern 1:
  // const prompt = Array.isArray(options.prompt) ? options.prompt.join('\n') : options.prompt;
  // args.push('--print', prompt); (claude) or args.push('--prompt', prompt);
  
  const promptRegex = /(?:const\s+prompt\s*=\s*(?:Array\.isArray\(options\.prompt\)\s*\?\s*options\.prompt\.join\('\\n'\)\s*:\s*options\.prompt|options\.prompt\s*(?:as\s*string)?|this\.normalizePrompt\(options\.prompt\));\s*)?args\.push\('(--print|--prompt)',\s*(?:prompt|options\.prompt\s*(?:as\s*string)?)\);/g;

  content = content.replace(promptRegex, (match, flag) => {
    changed = true;
    return `const { prompt, stdin } = this.buildPromptTransport(options);\n    if (stdin === undefined) {\n      args.push('${flag}', prompt);\n    }`;
  });

  // Also we must add 'stdin,' to the return object of buildSpawnArgs
  // Return looks like:
  // return {
  //   command: this.cliCommand,
  //   args,
  //   env: this.buildEnvFromOptions(options),
  //   cwd: options.cwd ?? process.cwd(),
  //   usePty: false,
  //   timeout: options.timeout,
  //   inactivityTimeout: options.inactivityTimeout,
  // };

  if (changed) {
    // Inject `stdin,` if not present
    const returnRegex = /(return\s*\{[\s\S]*?cwd:\s*options\.cwd[\s\S]*?usePty:\s*(?:true|false),)(?![\s\S]*stdin:)/g;
    content = content.replace(returnRegex, '$1\n      stdin,');

    // Remove duplicates if the file was partially updated before
    // (Wait, some might already have buildPromptTransport)
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', file);
  }
}
