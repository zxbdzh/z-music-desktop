import { describe, expect, it } from 'vitest'
import { LIST_IDS } from '@common/constants'

import {
  LOVE_LIST_ID,
  buildLibraryLocationQuery,
  buildLibraryTabQuery,
  getLibraryTabIds,
  rememberNonLoveListId,
  resolveLibraryView,
} from './libraryState'

describe('library list selection', () => {
  it('restores the last non-love list after leaving Liked', () => {
    const likedQuery = buildLibraryTabQuery(
      { id: 'road-trip', tab: 'all' },
      'liked',
      'road-trip'
    )
    expect(likedQuery.id).toBe(LOVE_LIST_ID)

    const restoredQuery = buildLibraryTabQuery(likedQuery, 'all', 'road-trip')
    expect(restoredQuery.id).toBe('road-trip')
  })

  it('uses the default list when a direct Liked entry has no non-love history', () => {
    const persistedListId = rememberNonLoveListId(LOVE_LIST_ID)
    const query = buildLibraryTabQuery(
      { id: LOVE_LIST_ID, tab: 'liked' },
      'all',
      persistedListId
    )

    expect(query.id).toBe(LIST_IDS.DEFAULT)
  })
})

describe('library navigation', () => {
  it('only exposes Downloads when downloads are enabled', () => {
    expect(getLibraryTabIds(false)).not.toContain('download')
    expect(getLibraryTabIds(true)).toContain('download')
  })

  it('opens the original NetEase Cloud view from the Cloud location', () => {
    const query = buildLibraryLocationQuery({ tab: 'liked' }, 'cloud')
    expect(query).toMatchObject({ tab: 'all', location: 'cloud', legacy: 'wy' })
    expect(resolveLibraryView('all', query.legacy, true)).toBe('wy')
  })

  it('opens the original WebDAV view from the WebDAV location', () => {
    const query = buildLibraryLocationQuery({}, 'webdav')
    expect(query).toMatchObject({ tab: 'all', location: 'webdav', legacy: 'webdav' })
    expect(resolveLibraryView('all', query.legacy, true)).toBe('webdav')
  })

  it('keeps Playlists distinct from the combined collection', () => {
    expect(resolveLibraryView('all', undefined, true)).toBe('collection')
    expect(resolveLibraryView('playlists', undefined, true)).toBe('playlists')
  })

  it('falls back to the collection when a disabled download route is opened', () => {
    expect(resolveLibraryView('download', undefined, false)).toBe('collection')
  })
})
