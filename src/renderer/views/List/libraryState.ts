import { LIST_IDS } from '@common/constants'

export const LOVE_LIST_ID = LIST_IDS.LOVE

export type LibraryTab = 'all' | 'playlists' | 'liked' | 'download'
export type LibraryLocation = 'all' | 'local' | 'cloud' | 'webdav'
export type LegacyLibraryView = 'wy' | 'webdav'
export type LibraryView = 'collection' | 'playlists' | 'liked' | 'download' | LegacyLibraryView
export type LibraryQuery = Record<string, unknown>

const TAB_IDS: LibraryTab[] = ['all', 'playlists', 'liked', 'download']
const LOCATION_IDS: LibraryLocation[] = ['all', 'local', 'cloud', 'webdav']

export const normalizeLibraryTab = (tab: unknown, downloadEnabled = true): LibraryTab => {
  if (!TAB_IDS.includes(tab as LibraryTab)) return 'all'
  return tab == 'download' && !downloadEnabled ? 'all' : (tab as LibraryTab)
}

export const normalizeLibraryLocation = (location: unknown): LibraryLocation =>
  LOCATION_IDS.includes(location as LibraryLocation) ? (location as LibraryLocation) : 'all'

export const getLibraryTabIds = (downloadEnabled: boolean): LibraryTab[] =>
  downloadEnabled ? [...TAB_IDS] : TAB_IDS.filter((tab) => tab != 'download')

export const rememberNonLoveListId = (
  candidate: unknown,
  previous?: string | null
): string | null =>
  typeof candidate == 'string' && candidate && candidate != LOVE_LIST_ID
    ? candidate
    : (previous ?? null)

export const buildLibraryTabQuery = (
  query: LibraryQuery,
  tab: LibraryTab,
  lastNonLoveListId?: string | null
): LibraryQuery => {
  const nextQuery: LibraryQuery = { ...query, tab }
  delete nextQuery.legacy
  if (nextQuery.location == 'cloud' || nextQuery.location == 'webdav') nextQuery.location = 'all'
  if (tab == 'liked') nextQuery.id = LOVE_LIST_ID
  else if (nextQuery.id == LOVE_LIST_ID) {
    nextQuery.id = rememberNonLoveListId(lastNonLoveListId) ?? LIST_IDS.DEFAULT
  }
  return nextQuery
}

export const buildLibraryLocationQuery = (
  query: LibraryQuery,
  location: LibraryLocation,
  lastNonLoveListId?: string | null
): LibraryQuery => {
  const nextQuery: LibraryQuery = { ...query, tab: 'all', location }
  if (nextQuery.id == LOVE_LIST_ID) {
    nextQuery.id = rememberNonLoveListId(lastNonLoveListId) ?? LIST_IDS.DEFAULT
  }
  if (location == 'cloud') nextQuery.legacy = 'wy'
  else if (location == 'webdav') nextQuery.legacy = 'webdav'
  else delete nextQuery.legacy
  return nextQuery
}

export const resolveLibraryView = (
  tab: LibraryTab,
  legacy: unknown,
  downloadEnabled: boolean
): LibraryView => {
  if (legacy == 'wy') return 'wy'
  if (legacy == 'webdav') return 'webdav'
  const normalizedTab = normalizeLibraryTab(tab, downloadEnabled)
  if (normalizedTab == 'download') return 'download'
  if (normalizedTab == 'playlists') return 'playlists'
  if (normalizedTab == 'liked') return 'liked'
  return 'collection'
}
