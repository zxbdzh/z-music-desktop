export type MediaItemId = string
export type CollectionId = string
export type ListId = string

export interface MediaItem {
  id: MediaItemId
  source: string
  title: string
  artist: string
  album: string | null
  artworkUrl: string | null
  durationMs: number | null
}

export const LIBRARY_LOCATIONS = ['all', 'local', 'cloud', 'webdav'] as const

export type LibraryLocation = (typeof LIBRARY_LOCATIONS)[number]

export const normalizeLibraryLocation = (
  value: unknown,
  fallback: LibraryLocation = 'all'
): LibraryLocation =>
  LIBRARY_LOCATIONS.includes(value as LibraryLocation) ? (value as LibraryLocation) : fallback

export interface RecoverableError {
  code: string
  message: string
  recoverable: true
}

export type OperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RecoverableError }
