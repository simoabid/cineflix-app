/**
 * Backend ESLint flat config (ESLint v10 + typescript-eslint).
 *
 * NOTE: The frontend uses ESLint v8 with legacy .eslintrc format.
 * The backend was migrated to the modern flat config format independently.
 * Both projects are linted separately and this divergence is intentional.
 */
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'logs/'],
  }
);
