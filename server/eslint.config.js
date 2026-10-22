// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** The layers (D21): domain ← application ← infrastructure, and api composes them. Like Slovion's architecture tests. */
const layer = (files, forbidden, message) => ({
  files,
  // Tests compose the layers.
  ignores: ['**/*.spec.ts', 'src/testing/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: forbidden.map((group) => ({ group: [group], message })) },
    ],
  },
});

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  layer(
    ['src/domain/**/*.ts'],
    ['**/application/**', '**/infrastructure/**', '**/api/**', 'pg', 'ws', 'fastify', '@fastify/*'],
    'The domain depends on nothing (D21).',
  ),
  layer(
    ['src/application/**/*.ts'],
    ['**/infrastructure/**', '**/api/**', 'pg', 'ws', 'fastify', '@fastify/*'],
    'The application depends only on the domain; infrastructure implements its ports (D21).',
  ),
  layer(
    ['src/infrastructure/**/*.ts'],
    ['**/api/**', 'ws', 'fastify', '@fastify/*'],
    'Infrastructure implements ports; the api composes (D21).',
  ),
);
