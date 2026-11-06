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
  // API layering: routes → controllers → services → models.
  // Each layer may import only the layers listed in `allow`.
  {
    files: ['apps/api/src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      'import/resolver': { typescript: { project: `${import.meta.dirname}/apps/api/tsconfig.json` } },
      'boundaries/elements': [
        { type: 'entry', pattern: 'apps/api/src/*.ts', mode: 'file' },
        { type: 'routes', pattern: 'apps/api/src/routes', mode: 'folder' },
        { type: 'controllers', pattern: 'apps/api/src/controllers', mode: 'folder' },
        { type: 'services', pattern: 'apps/api/src/services', mode: 'folder' },
        { type: 'models', pattern: 'apps/api/src/models', mode: 'folder' },
        { type: 'middlewares', pattern: 'apps/api/src/middlewares', mode: 'folder' },
        { type: 'subscribers', pattern: 'apps/api/src/subscribers', mode: 'folder' },
        { type: 'events', pattern: 'apps/api/src/events', mode: 'folder' },
        { type: 'templates', pattern: 'apps/api/src/templates', mode: 'folder' },
        { type: 'utils', pattern: 'apps/api/src/utils', mode: 'folder' },
        { type: 'config', pattern: 'apps/api/src/config', mode: 'folder' },
        { type: 'scripts', pattern: 'apps/api/src/scripts', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'entry', allow: ['entry', 'routes', 'middlewares', 'subscribers', 'config'] },
            { from: 'routes', allow: ['routes', 'controllers', 'middlewares', 'utils'] },
            { from: 'controllers', allow: ['services', 'middlewares', 'utils', 'config'] },
            { from: 'services', allow: ['services', 'models', 'events', 'utils', 'config'] },
            { from: 'models', allow: ['models'] },
            { from: 'middlewares', allow: ['middlewares', 'services', 'utils', 'config'] },
            { from: 'subscribers', allow: ['services', 'events', 'templates', 'config'] },
            { from: 'events', allow: ['events', 'config'] },
            { from: 'templates', allow: ['templates'] },
            { from: 'utils', allow: ['utils', 'config'] },
            { from: 'config', allow: ['config'] },
            { from: 'scripts', allow: ['services', 'utils', 'config'] },
          ],
        },
      ],
    },
  },
);
