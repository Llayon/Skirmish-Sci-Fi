module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    'no-case-declarations': 'warn',
    'react/no-unknown-property': 'off', // Three.js elements
    'react-hooks/rules-of-hooks': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react/prop-types': 'off', // TypeScript handles props
    'react/display-name': 'off',
    'prefer-const': 'warn',
    'no-constant-condition': 'warn',
    'no-extra-semi': 'warn',
  },
  overrides: [
    {
      files: ['services/engine/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'Math',
            property: 'random',
            message: 'Use seeded RNG from services/engine/rng instead of Math.random in engine.',
          },
          {
            object: 'Date',
            property: 'now',
            message: 'Do not use Date.now in engine; pass time via state if needed.',
          },
          {
            object: 'performance',
            property: 'now',
            message: 'Do not use performance.now in engine; pass time via state if needed.',
          },
        ],
      },
    },
  ],
}
