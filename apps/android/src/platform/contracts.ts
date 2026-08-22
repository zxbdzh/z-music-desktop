export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface SettingsStore {
  get<T extends JsonValue = JsonValue>(key: string): Promise<T | null>
  set<T extends JsonValue>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

export interface SecureCredentialStore {
  get(service: string, account: string): Promise<string | null>
  set(service: string, account: string, value: string): Promise<void>
  remove(service: string, account: string): Promise<void>
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface HttpRequest {
  url: string
  method?: HttpMethod
  headers?: Record<string, string>
  body?: BodyInit | null
  signal?: AbortSignal
}

export interface HttpResponse<T = unknown> {
  status: number
  headers: Headers
  data: T
}

export interface HttpClient {
  request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>
}

export interface FilePickerOptions {
  accept?: string
  multiple?: boolean
}

export interface PickedFile {
  name: string
  size: number
  type: string
  file?: File
}

export interface FilePicker {
  pick(options?: FilePickerOptions): Promise<ReadonlyArray<PickedFile>>
}

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface DownloadRequest {
  id: string
  url: string
  fileName: string
  mimeType?: string
}

export interface DownloadItem extends DownloadRequest {
  status: DownloadStatus
  progress: number
  error?: string
}

export type DownloadListener = (items: ReadonlyArray<DownloadItem>) => void

export interface DownloadStore {
  list(): Promise<ReadonlyArray<DownloadItem>>
  enqueue(request: DownloadRequest): Promise<DownloadItem>
  pause(id: string): Promise<void>
  resume(id: string): Promise<void>
  cancel(id: string): Promise<void>
  subscribe(listener: DownloadListener): () => void
}

export type LifecycleState = 'active' | 'inactive' | 'background'

export interface Lifecycle {
  current(): LifecycleState
  subscribe(listener: (state: LifecycleState) => void): () => void
}

export interface SharePayload {
  title?: string
  text?: string
  url?: string
  dialogTitle?: string
}

export type ShareResult = 'shared' | 'copied' | 'dismissed'

export interface Share {
  share(payload: SharePayload): Promise<ShareResult>
}

export interface Track {
  id: string
  title: string
  artist?: string
  album?: string
  artworkUrl?: string
  durationMs?: number
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface PlayerState {
  status: PlayerStatus
  currentTrack: Track | null
  positionMs: number
  durationMs: number
}

export type PlayerListener = (state: PlayerState) => void

export interface PlayerBridge {
  getState(): Promise<PlayerState>
  setQueue(tracks: ReadonlyArray<Track>, startIndex?: number): Promise<void>
  load(track: Track): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(positionMs: number): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  subscribe(listener: PlayerListener): () => void
}

export interface PlatformServices {
  settings: SettingsStore
  credentials: SecureCredentialStore
  http: HttpClient
  files: FilePicker
  downloads: DownloadStore
  lifecycle: Lifecycle
  share: Share
  player: PlayerBridge
}

export const PLATFORM_CONTRACTS = [
  'SettingsStore',
  'SecureCredentialStore',
  'HttpClient',
  'FilePicker',
  'DownloadStore',
  'Lifecycle',
  'Share',
  'PlayerBridge'
] as const
