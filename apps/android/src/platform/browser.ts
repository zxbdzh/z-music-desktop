import type {
  DownloadItem,
  DownloadListener,
  DownloadRequest,
  DownloadStore,
  FilePicker,
  FilePickerOptions,
  HttpClient,
  HttpRequest,
  HttpResponse,
  Lifecycle,
  LifecycleState,
  PickedFile,
  PlayerBridge,
  PlayerListener,
  PlayerState,
  SecureCredentialStore,
  SettingsStore,
  Share,
  SharePayload,
  ShareResult,
  Track,
  PlatformServices,
  JsonValue
} from './contracts'

function readStorage(storage: Storage | undefined, key: string): JsonValue | null {
  if (!storage) return null
  try {
    const value = storage.getItem(key)
    return value === null ? null : JSON.parse(value) as JsonValue
  } catch {
    return null
  }
}

class LocalSettingsStore implements SettingsStore {
  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  async get<T extends JsonValue = JsonValue>(key: string): Promise<T | null> {
    return readStorage(this.storage, key) as T | null
  }

  async set<T extends JsonValue>(key: string, value: T): Promise<void> {
    this.storage?.setItem(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    this.storage?.removeItem(key)
  }

  async clear(): Promise<void> {
    this.storage?.clear()
  }
}

/** Credentials intentionally remain unavailable until a native keystore adapter is wired. */
class UnavailableSecureCredentialStore implements SecureCredentialStore {
  private unavailableError(): Error {
    return new Error('Secure credentials require the Android Keystore adapter.')
  }

  get(): Promise<string | null> {
    return Promise.reject(this.unavailableError())
  }

  set(): Promise<void> {
    return Promise.reject(this.unavailableError())
  }

  remove(): Promise<void> {
    return Promise.reject(this.unavailableError())
  }
}

class FetchHttpClient implements HttpClient {
  async request<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>> {
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: request.headers,
      body: request.body,
      signal: request.signal
    })
    const contentType = response.headers.get('content-type') ?? ''
    const data = (contentType.includes('application/json')
      ? await response.json()
      : await response.text()) as T
    return { status: response.status, headers: response.headers, data }
  }
}

class BrowserFilePicker implements FilePicker {
  pick(options: FilePickerOptions = {}): Promise<ReadonlyArray<PickedFile>> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = options.accept ?? 'audio/*'
      input.multiple = options.multiple ?? true
      input.addEventListener('change', () => {
        const files = Array.from(input.files ?? []).map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          file
        }))
        resolve(files)
      }, { once: true })
      input.addEventListener('cancel', () => resolve([]), { once: true })
      input.click()
    })
  }
}

class MemoryDownloadStore implements DownloadStore {
  private readonly items = new Map<string, DownloadItem>()
  private readonly listeners = new Set<DownloadListener>()

  async list(): Promise<ReadonlyArray<DownloadItem>> {
    return [...this.items.values()]
  }

  async enqueue(request: DownloadRequest): Promise<DownloadItem> {
    const item: DownloadItem = { ...request, status: 'queued', progress: 0 }
    this.items.set(item.id, item)
    this.emit()
    return item
  }

  async pause(id: string): Promise<void> {
    this.updateStatus(id, 'paused')
  }

  async resume(id: string): Promise<void> {
    this.updateStatus(id, 'downloading')
  }

  async cancel(id: string): Promise<void> {
    this.updateStatus(id, 'cancelled')
  }

  subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private updateStatus(id: string, status: DownloadItem['status']): void {
    const item = this.items.get(id)
    if (!item) return
    item.status = status
    this.emit()
  }

  private emit(): void {
    const snapshot = [...this.items.values()]
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

class BrowserLifecycle implements Lifecycle {
  private state: LifecycleState = document.visibilityState === 'visible' ? 'active' : 'background'
  private readonly listeners = new Set<(state: LifecycleState) => void>()

  constructor() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  current(): LifecycleState {
    return this.state
  }

  subscribe(listener: (state: LifecycleState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private readonly handleVisibilityChange = (): void => {
    this.state = document.visibilityState === 'visible' ? 'active' : 'background'
    this.listeners.forEach((listener) => listener(this.state))
  }
}

class BrowserShare implements Share {
  async share(payload: SharePayload): Promise<ShareResult> {
    if (navigator.share) {
      try {
        await navigator.share(payload)
        return 'shared'
      } catch {
        return 'dismissed'
      }
    }
    const text = [payload.title, payload.text, payload.url].filter(Boolean).join('\n')
    if (text && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
    return 'dismissed'
  }
}

class NoopPlayerBridge implements PlayerBridge {
  private state: PlayerState = { status: 'idle', currentTrack: null, positionMs: 0, durationMs: 0 }
  private queue: ReadonlyArray<Track> = []
  private index = 0
  private readonly listeners = new Set<PlayerListener>()

  async getState(): Promise<PlayerState> {
    return { ...this.state }
  }

  async setQueue(tracks: ReadonlyArray<Track>, startIndex = 0): Promise<void> {
    this.queue = tracks
    this.index = Math.max(0, Math.min(startIndex, tracks.length - 1))
    this.state.currentTrack = tracks[this.index] ?? null
    this.state.status = 'paused'
    this.emit()
  }

  async load(track: Track): Promise<void> {
    this.state = { status: 'paused', currentTrack: track, positionMs: 0, durationMs: track.durationMs ?? 0 }
    this.emit()
  }

  async play(): Promise<void> {
    if (!this.state.currentTrack) return
    this.state.status = 'playing'
    this.emit()
  }

  async pause(): Promise<void> {
    this.state.status = this.state.currentTrack ? 'paused' : 'idle'
    this.emit()
  }

  async seek(positionMs: number): Promise<void> {
    this.state.positionMs = Math.max(0, Math.min(positionMs, this.state.durationMs || positionMs))
    this.emit()
  }

  async next(): Promise<void> {
    if (this.index >= this.queue.length - 1) return
    await this.load(this.queue[++this.index])
  }

  async previous(): Promise<void> {
    if (this.index <= 0) return
    await this.load(this.queue[--this.index])
  }

  subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const snapshot = { ...this.state }
    this.listeners.forEach((listener) => listener(snapshot))
  }
}

export function createBrowserPlatform(): PlatformServices {
  return {
    settings: new LocalSettingsStore(),
    credentials: new UnavailableSecureCredentialStore(),
    http: new FetchHttpClient(),
    files: new BrowserFilePicker(),
    downloads: new MemoryDownloadStore(),
    lifecycle: new BrowserLifecycle(),
    share: new BrowserShare(),
    player: new NoopPlayerBridge()
  }
}
