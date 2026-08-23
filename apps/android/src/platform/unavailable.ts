import type { PlatformServices, PlayerState } from './contracts'

const idlePlayerState: PlayerState = {
  status: 'idle',
  currentTrack: null,
  positionMs: 0,
  durationMs: 0
}

function unavailable(capability: string): Error {
  return new Error(`${capability} requires the native Android platform adapter.`)
}

export function createUnavailablePlatform(): PlatformServices {
  return {
    settings: {
      get: async () => null,
      set: async () => { throw unavailable('Settings') },
      remove: async () => { throw unavailable('Settings') },
      clear: async () => { throw unavailable('Settings') }
    },
    credentials: {
      get: async () => { throw unavailable('Secure credentials') },
      set: async () => { throw unavailable('Secure credentials') },
      remove: async () => { throw unavailable('Secure credentials') }
    },
    http: {
      request: async () => { throw unavailable('HTTP') }
    },
    files: {
      pick: async () => { throw unavailable('File picking') }
    },
    downloads: {
      list: async () => [],
      enqueue: async () => { throw unavailable('Downloads') },
      pause: async () => { throw unavailable('Downloads') },
      resume: async () => { throw unavailable('Downloads') },
      cancel: async () => { throw unavailable('Downloads') },
      subscribe: () => () => {}
    },
    lifecycle: {
      current: () => 'active',
      subscribe: () => () => {}
    },
    share: {
      share: async () => { throw unavailable('Sharing') }
    },
    player: {
      getState: async () => ({ ...idlePlayerState }),
      setQueue: async () => { throw unavailable('Playback') },
      load: async () => { throw unavailable('Playback') },
      play: async () => { throw unavailable('Playback') },
      pause: async () => { throw unavailable('Playback') },
      seek: async () => { throw unavailable('Playback') },
      next: async () => { throw unavailable('Playback') },
      previous: async () => { throw unavailable('Playback') },
      subscribe: () => () => {}
    }
  }
}
