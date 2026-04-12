// ESLint flat config with a local `max-file-lines` rule.
// Counts "effective" lines — non-blank, non-comment-only — and reports when
// a source file exceeds the configured threshold (default 400).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Count effective lines: skip blank lines and comment-only lines.
 * Handles line comments (//), block comments (/* ... *\/), and continuation
 * of block comments across lines.
 */
function countEffectiveLines(sourceText) {
  const lines = sourceText.split(/\r?\n/);
  let inBlock = false;
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;
    let effective = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) { i = line.length; break; }
        inBlock = false;
        i = end + 2;
        continue;
      }
      if (line.startsWith('//', i)) {
        // Rest of line is a comment.
        break;
      }
      if (line.startsWith('/*', i)) {
        inBlock = true;
        i += 2;
        continue;
      }
      effective += line[i];
      i += 1;
    }
    if (effective.trim().length > 0) count += 1;
  }
  return count;
}

const maxFileLinesPlugin = {
  rules: {
    'max-file-lines': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Limit effective (non-blank, non-comment-only) lines per file.' },
        schema: [{
          type: 'object',
          properties: { max: { type: 'integer', minimum: 1 } },
          additionalProperties: false,
        }],
        messages: {
          tooLong: 'File has {{count}} effective lines, exceeds maximum of {{max}}.',
        },
      },
      create(context) {
        const options = context.options[0] || {};
        const max = options.max ?? 400;
        return {
          Program(node) {
            const source = context.sourceCode ?? context.getSourceCode();
            const effective = countEffectiveLines(source.getText());
            if (effective > max) {
              context.report({
                node,
                messageId: 'tooLong',
                data: { count: String(effective), max: String(max) },
              });
            }
          },
        };
      },
    },
  },
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/tests/**',
      'tests/**',
      'packages/*/tests/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts'],
    plugins: { local: maxFileLinesPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
    },
    rules: {
      'local/max-file-lines': ['error', { max: 400 }],
      // Relax base JS rules that don't make sense for TypeScript source.
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-dupe-class-members': 'off',
      'no-empty': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-useless-escape': 'off',
      'no-inner-declarations': 'off',
      'no-case-declarations': 'off',
      'no-useless-assignment': 'off',
      'no-unused-private-class-members': 'off',
    },
  },
];
