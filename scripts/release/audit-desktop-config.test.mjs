import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DESKTOP_RELEASE } from './desktop-config.mjs'

test('freezes the Desktop 1.5 compatibility and artifact contract', () => {
  assert.deepEqual(DESKTOP_RELEASE.windowsArtifacts, [
    'z-music-desktop-v1.5.0-x64-Setup.exe',
    'z-music-desktop-v1.5.0-x64-portable.exe',
  ])
  assert.equal(DESKTOP_RELEASE.appId, 'cn.toside.music.desktop')
  assert.equal(DESKTOP_RELEASE.protocolScheme, 'lxmusic')
  assert.equal(DESKTOP_RELEASE.oauthCallback, 'lxmusic://oauth/callback')
  assert.equal(DESKTOP_RELEASE.legacyUserDataDir, 'ikun-music-desktop')
})
