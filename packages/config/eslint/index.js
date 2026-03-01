/**
 * Shared ESLint configuration for the Edin monorepo.
 * Individual apps extend this with their own specific rules.
 */
module.exports = {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
