import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/*.js', '**/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
  {
    files: ['**/tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  // §13: API modules talk to each other only through their services.
  {
    files: ['apps/api/src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: 'apps/api/tsconfig.json' } },
      'boundaries/elements': [
        { type: 'module', pattern: 'apps/api/src/modules/*', mode: 'folder', capture: ['name'] },
      ],
    },
    rules: {
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [{ target: ['module'], allow: ['*.service.ts', '*.routes.ts', '*.subscribers.ts'] }],
        },
      ],
    },
  },
);
