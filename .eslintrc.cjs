const { base, typescript, vue } = require('./.eslintrc.base.cjs')

module.exports = {
  root: true,
  ...base,
  globals: {
    LX: 'readonly',
    COMMIT_ID: 'readonly',
    COMMIT_DATE: 'readonly',
  },
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
    'dist',
    'build',
    'build-*',
    'publish',
    'output',
    '.artifacts',
    'src/**/*.d.ts',
    // Vendored/generated files. Integrity, provenance, and security are checked separately.
    'src/common/utils/effects/snow.min.js',
    'src/renderer/utils/musicSdk/kg/vendors/infSign.min.js',
    'src/static/audio_match/afp.js',
    'src/static/audio_match/afp.wasm.js',
    'src/renderer/utils/audioMatch/afp.js',
    'src/renderer/utils/audioMatch/afp.wasm.js',
  ],
}
