import { describe, expect, it } from 'vitest'

import {
  LIBRARY_LOCATIONS,
  normalizeLibraryLocation,
  type MediaItem,
  type OperationResult,
} from './index'

describe('mobile shared contracts', () => {
  it('restores persisted library locations with a stable fallback', () => {
    for (const location of LIBRARY_LOCATIONS) {
      expect(normalizeLibraryLocation(JSON.parse(JSON.stringify(location)))).toBe(location)
    }
    expect(normalizeLibraryLocation('unknown')).toBe('all')
    expect(normalizeLibraryLocation(null, 'local')).toBe('local')
  })

  it('keeps representative media results JSON-compatible', () => {
    const result: OperationResult<MediaItem> = {
      ok: true,
      value: {
        id: 'track-1',
        source: 'wy',
        title: 'Example',
        artist: 'Artist',
        album: null,
        artworkUrl: 'https://example.test/cover.jpg',
        durationMs: 180_000,
      },
    }
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('keeps recoverable failures JSON-compatible', () => {
    const result: OperationResult<never> = {
      ok: false,
      error: { code: 'network_unavailable', message: 'Try again later.', recoverable: true },
    }
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })
})
