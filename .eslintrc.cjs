const { base, typescript, vue } = require('./.eslintrc.base.cjs')

module.exports = {
  root: true,
  ...base,
  overrides: [
    {
      ...typescript,
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
    {
      ...vue,
    },
  ],
  ignorePatterns: [
    'node_modules',
    '*.min.js',
    'dist',
    'build',
    'build-*',
    'publish',
    'output',
    '.artifacts',
    'src/**/*.d.ts',
  ],
}
