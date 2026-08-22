import { describe, expect, it } from 'vitest'

import {
  LIBRARY_LOCATIONS,
  normalizeLibraryLocation,
  normalizeWyApiBaseUrl,
  validateWyApiBaseUrl,
  type MediaItem,
  type OperationResult,
} from '@common/mobile'

describe('Android shared-core boundary', () => {
  it('uses the shared NetEase URL policy through the configured alias', () => {
    expect(normalizeWyApiBaseUrl('http://localhost:3000/netease///')).toBe(
      'http://localhost:3000/netease'
    )
    expect(validateWyApiBaseUrl(' http://localhost:3000/netease').valid).toBe(false)
    expect(validateWyApiBaseUrl('http://localhost.example.test:3000').valid).toBe(false)
    expect(validateWyApiBaseUrl('http://127.0.0.01:3000').valid).toBe(false)
    expect(validateWyApiBaseUrl('http://192.168.1.10:3000').valid).toBe(false)
    expect(validateWyApiBaseUrl('https://api.example.test/base').valid).toBe(true)
  })

  it('restores library state and serializes media operation results', () => {
    expect(normalizeLibraryLocation('webdav')).toBe('webdav')
    expect(normalizeLibraryLocation('invalid')).toBe('all')
    expect(LIBRARY_LOCATIONS).toContain('local')

    const item: MediaItem = {
      id: 'local-1',
      source: 'local',
      title: 'Local track',
      artist: 'Artist',
      album: null,
      artworkUrl: null,
      durationMs: 1_000,
    }
    const result: OperationResult<MediaItem> = { ok: true, value: item }
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })
})
