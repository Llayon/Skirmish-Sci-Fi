module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: [],
  rules: {},
  overrides: [
    {
      files: ['services/engine/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['zustand', 'zustand/*'],
                message: 'Engine V2 must be pure and decoupled from Zustand. Do not import store hooks or create functions.'
              },
              {
                group: ['react', 'react-dom'],
                message: 'Engine V2 must be pure logic. UI libraries like React are forbidden.'
              },
              {
                group: ['@/components/*', '@/hooks/*', '@/stores/*'],
                message: 'Engine V2 cannot depend on UI components, React hooks, or global stores.'
              }
            ]
          }
        ],
        'no-restricted-properties': [
          'error',
          {
            object: 'Math',
            property: 'random',
            message: 'Engine: Math.random() is forbidden. Use services/engine/rng instead.'
          },
          {
            object: 'Date',
            property: 'now',
            message: 'Engine: Date.now() is forbidden. Pass time as a dependency or use deterministic source.'
          },
          {
            object: 'performance',
            property: 'now',
            message: 'Engine: performance.now() is forbidden. Pass time as a dependency or use deterministic source.'
          }
        ]
      }
    }
  ]
}
