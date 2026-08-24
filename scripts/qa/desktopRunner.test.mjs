import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(new URL('../../build-config/runner-dev.js', import.meta.url))
const runtimeDependencies = [
  'chalk', 'electron', 'express', 'webpack', 'webpack-dev-server',
  'html-webpack-plugin', 'webpack-hot-middleware', 'electron-builder', 'tree-kill', 'spinnies',
]

test('development Electron runner declares every direct runtime dependency', () => {
  for (const dependency of runtimeDependencies) {
    assert.doesNotThrow(() => require.resolve(dependency), dependency)
  }
})

test('development Electron runner forwards CDP before the app entry and gates it by environment', () => {
  const runner = readFileSync(new URL('../../build-config/runner-dev.js', import.meta.url), 'utf8')
  const entry = runner.indexOf("path.join(__dirname, '../dist/main.js')")
  assert.ok(runner.indexOf('...chromiumArgs') < entry)
  assert.ok(runner.indexOf('...applicationArgs') > entry)
  assert.match(runner, /Z_MUSIC_CDP_PORT/)

  const devEntry = readFileSync(new URL('../../src/main/index-dev.ts', import.meta.url), 'utf8')
  assert.match(devEntry, /appendSwitch\('remote-debugging-port', cdpPort\)/)
  assert.match(devEntry, /Number\(cdpPort\) <= 65535/)
})
