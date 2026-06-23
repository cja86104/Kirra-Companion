/**
 * Next.js 15 flat ESLint config.
 *
 * Next.js's CLI detects the @next/next plugin by walking the resolved
 * config and looking for a config object whose `plugins` map contains a
 * key named `@next/next`. With ESLint 9 flat config, loading the
 * eslint-config-next preset through FlatCompat alone is not enough —
 * Next's detector doesn't always reach into the compat-converted objects.
 *
 * Solution: explicitly register the plugin AND its recommended +
 * core-web-vitals rules in a top-level config object so Next finds it
 * unambiguously. This is the same pattern @next/codemod uses when it
 * converts a legacy .eslintrc.json to flat config.
 *
 * No new npm deps: @next/eslint-plugin-next is installed transitively
 * via eslint-config-next (which is already a direct dep).
 */
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Global ignores - must be a separate object
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      '*.config.js',
      '*.config.mjs',
      'scripts/**',
      'next-env.d.ts',
      'tailwind.config.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // FlatCompat brings the full eslint-config-next preset (React Hooks,
  // jsx-a11y, TypeScript parser settings, etc).
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Explicit @next/next registration so Next 15's `next lint` CLI detects
  // the plugin. Next 15 (node_modules/next/dist/lib/eslint/runLintCheck.js
  // ~line 188) calls `eslint.calculateConfigForFile(package.json)` and
  // checks `'@next/next' in plugins`. If our registration block has a
  // `files: ['**/*.{ts,tsx,...}']` gate, ESLint excludes the block when
  // resolving config for package.json (which doesn't match), the plugins
  // map comes back empty, and Next prints:
  //   "The Next.js plugin was not detected in your ESLint configuration"
  // even though the rules are active for source files. The fix is to omit
  // the `files` filter on this block so the plugin is registered globally —
  // this affects detection only, not enforcement (rules still scope by
  // file via the matchers inside the rules themselves).
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
