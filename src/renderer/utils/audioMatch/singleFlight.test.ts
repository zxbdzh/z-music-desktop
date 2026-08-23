import { describe, expect, it, vi } from 'vitest'
import { createSingleFlightLoader } from './singleFlight'

describe('createSingleFlightLoader', () => {
  it('shares one load across concurrent callers and caches the result', async () => {
    let resolveLoad!: (value: string) => void
    const load = vi.fn(() => new Promise<string>((resolve) => { resolveLoad = resolve }))
    const loader = createSingleFlightLoader(load)

    const first = loader.get()
    const second = loader.get()
    expect(load).toHaveBeenCalledTimes(1)

    resolveLoad('fingerprint-runtime')
    await expect(first).resolves.toBe('fingerprint-runtime')
    await expect(second).resolves.toBe('fingerprint-runtime')
    await expect(loader.get()).resolves.toBe('fingerprint-runtime')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after a failed load', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce('recovered')
    const loader = createSingleFlightLoader<string>(load)

    await expect(loader.get()).rejects.toThrow('load failed')
    await expect(loader.get()).resolves.toBe('recovered')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('invalidates an in-flight result after reset', async () => {
    let resolveLoad!: (value: string) => void
    const load = vi.fn(() => new Promise<string>((resolve) => { resolveLoad = resolve }))
    const loader = createSingleFlightLoader(load)

    const stale = loader.get()
    loader.reset()
    resolveLoad('stale')
    await expect(stale).rejects.toThrow('reset while the request was in flight')
  })
})
