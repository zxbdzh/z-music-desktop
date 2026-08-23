import { describe, expect, it, vi } from 'vitest'
import { createRetryablePromiseCache } from './retryablePromiseCache'

describe('createRetryablePromiseCache', () => {
  it('shares one in-flight load and caches the successful value', async () => {
    let resolveLoad!: (value: string) => void
    const load = vi.fn(() => new Promise<string>((resolve) => { resolveLoad = resolve }))
    const cache = createRetryablePromiseCache(load)

    const first = cache.get()
    const second = cache.get()
    expect(load).toHaveBeenCalledTimes(1)
    resolveLoad('ready')
    await expect(Promise.all([first, second])).resolves.toEqual(['ready', 'ready'])
    await expect(cache.get()).resolves.toBe('ready')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('clears a rejected load so the next call can recover', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('recovered')
    const cache = createRetryablePromiseCache<string>(load)

    await expect(cache.get()).rejects.toThrow('temporary failure')
    await expect(cache.get()).resolves.toBe('recovered')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('keeps an explicit value when an older request resolves', async () => {
    let resolveLoad!: (value: string) => void
    const cache = createRetryablePromiseCache(() => new Promise<string>((resolve) => {
      resolveLoad = resolve
    }))

    const stale = cache.get()
    cache.set('new-value')
    resolveLoad('stale-value')
    await expect(stale).resolves.toBe('stale-value')
    await expect(cache.get()).resolves.toBe('new-value')
  })

  it('keeps an explicit value when an older request rejects', async () => {
    let rejectLoad!: (error: Error) => void
    const cache = createRetryablePromiseCache(() => new Promise<string>((_resolve, reject) => {
      rejectLoad = reject
    }))

    const stale = cache.get()
    cache.set('new-value')
    rejectLoad(new Error('stale failure'))
    await expect(stale).rejects.toThrow('stale failure')
    await expect(cache.get()).resolves.toBe('new-value')
  })

  it('reloads after reset', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second')
    const cache = createRetryablePromiseCache<string>(load)

    await expect(cache.get()).resolves.toBe('first')
    cache.reset()
    await expect(cache.get()).resolves.toBe('second')
  })
})
