import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

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
      'tailwind.config.ts'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  }
];
