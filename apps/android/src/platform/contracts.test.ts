import { describe, expect, it } from 'vitest'
import { PLATFORM_CONTRACTS } from './contracts'

describe('platform contracts', () => {
  it('exposes every cross-platform boundary required by the Android shell', () => {
    expect(PLATFORM_CONTRACTS).toEqual([
      'SettingsStore',
      'SecureCredentialStore',
      'HttpClient',
      'FilePicker',
      'DownloadStore',
      'Lifecycle',
      'Share',
      'PlayerBridge'
    ])
  })
})
