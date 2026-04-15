import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

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
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
