/**
 * ESLint flat configuration for the TSP Simulator POC.
 *
 * Architecture (5 config objects in order of descending specificity):
 *
 * 1. Global ignores — build artifacts, generated reports, server/scripts helpers,
 *    and config files that self-lint would produce false positives on.
 *
 * 2. Base rulesets — `@eslint/js` recommended (core JS best practices) layered
 *    with `typescript-eslint` recommended-type-checked (security-sensitive rules)
 *    and stylistic-type-checked (formatting consistency).
 *
 * 3. Application source (`**\/*.{ts,tsx}` excluding configs) — the strictest tier:
 *    - react-hooks: enforces the Rules of Hooks (no conditional useEffect, etc.).
 *    - react-refresh: warns when a file exports anything other than components,
 *      keeping Fast Refresh compatible.
 *    - jsx-a11y: accessibility checks on JSX (alt text, aria attributes, etc.)
 *      because the simulator UI should be usable by screen-reader users.
 *    - Custom rules: no-any (error), eqeqeq (always ===), complexity ≤ 12,
 *      max 50 lines per function, max 4 parameters, no console.log (only warn/error
 *      allowed), no implicit coercion, no forbidden syntax (for-in, with, eval).
 *
 * 4. Config files, worker files, and test files — relaxed tier. Test helpers need
 *    console output for debugging; configs and workers deal with loosely-typed
 *    plugin APIs where unsafe-* rules produce unavoidable noise.
 *
 * 5. Algorithm files (`src/algorithms/**`) — relaxed tier. TSP algorithm
 *    implementations are inherently complex (recursive DFS, DP table iteration)
 *    and cannot reasonably fit into max-lines-per-function or complexity limits.
 *    Similarly, generator-based algorithms need more than 4 parameters for
 *    state tracking.
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'server/**',
      'scripts/**',
      '*.config.cjs',
      'commitlint.config.js',
      'postcss.config.js',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.config.{ts,js}', 'postcss.config.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/array-type': 'off',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-implicit-coercion': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
      complexity: ['error', 12],
      'max-lines-per-function': [
        'error',
        { max: 50, skipComments: true, skipBlankLines: true },
      ],
      'max-params': ['error', 4],
      'no-restricted-syntax': [
        'error',
        { selector: 'ForInStatement', message: 'Use Object.keys/for-of instead.' },
        { selector: 'WithStatement', message: 'forbidden' },
        { selector: "CallExpression[callee.name='eval']", message: 'forbidden' },
      ],
    },
  },
  {
    files: ['**/*.config.{ts,js}', '**/*.worker.ts', 'tests/**/*'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
  {
    files: ['src/algorithms/**/*'],
    rules: {
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-params': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['src/components/**/*', 'src/App.tsx', 'src/main.tsx'],
    rules: {
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-params': 'off',
    },
  },
);
