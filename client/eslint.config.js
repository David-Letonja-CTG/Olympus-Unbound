// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

const noAngular = [
  { group: ['@angular/*'], message: 'The engine must not depend on Angular (D2).' },
  { group: ['rxjs', 'rxjs/*'], message: 'The engine must not depend on RxJS (D2).' },
  { group: ['**/app/**', '**/app'], message: 'The engine must not import application code.' },
  {
    group: ['**/content', '**/content/*'],
    message: 'The engine receives content through createGameSession; it must not import it (D4).',
  },
  { group: ['peerjs'], message: 'The engine talks to rooms only through PeerLink (D16).' },
];

/** Angular sees the engine only through its public surface (D3). */
const appBoundaries = [
  {
    group: ['**/engine/**'],
    message: 'Import the engine only through src/engine/index.ts (D3).',
  },
  { group: ['phaser'], message: 'Angular must not use Phaser directly (D2).' },
];

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/core/rooms/peer-network.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...appBoundaries,
            {
              group: ['peerjs'],
              message: 'Only core/rooms/peer-network.ts uses PeerJS, loaded lazily (D16).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/rooms/peer-network.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: appBoundaries }] },
  },
  {
    // Content is data: it may use engine types only.
    files: ['src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/engine/**'],
              message: 'Content imports engine types from engine/index.ts.',
            },
            { group: ['@angular/*', 'phaser', '**/app/**'], message: 'Content is plain data.' },
          ],
        },
      ],
    },
  },
  {
    // The simulation is pure: no Angular, no Phaser, no uncontrolled randomness (D2, D5).
    files: ['src/engine/**/*.ts'],
    ignores: ['src/engine/phaser/**', 'src/engine/audio/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...noAngular,
            { group: ['phaser'], message: 'Only src/engine/phaser may import Phaser (D2).' },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded Rng (D5).' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'performance', message: 'The simulation advances only by step(dt) (D5).' },
        { name: 'Date', message: 'The simulation advances only by step(dt) (D5).' },
      ],
    },
  },
  {
    files: ['src/engine/phaser/**/*.ts', 'src/engine/audio/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: noAngular }],
    },
  },
  {
    // Engine tests may run against the real content; the engine itself never imports it.
    files: ['src/engine/**/*.spec.ts', 'src/engine/testing/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...noAngular.slice(0, 3),
            { group: ['phaser'], message: 'Engine tests run without Phaser.' },
          ],
        },
      ],
    },
  },
]);
