import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'
import { notice, noticeItems, resetNoticeState } from './index'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('notice lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetNoticeState()
  })

  afterEach(() => {
    resetNoticeState()
    vi.useRealTimers()
  })

  it('creates, updates and dismisses a stable id', () => {
    const id = notice.success('Saved')

    expect(id).toBe('notice-1')
    expect(noticeItems).toHaveLength(1)
    expect(notice.update(id, { message: 'Saved locally' })).toBe(true)
    expect(noticeItems[0]).toMatchObject({ id, type: 'success', message: 'Saved locally' })
    expect(notice.dismiss(id)).toBe(true)
    expect(noticeItems).toHaveLength(0)
  })

  it('notifies the host when an existing item changes in place', async () => {
    const id = notice.loading('Saving')
    const messages: string[] = []
    const stop = watch(
      () => noticeItems[0]?.message,
      (message) => {
        if (message) messages.push(message)
      }
    )

    notice.update(id, { type: 'success', message: 'Saved' })
    await nextTick()
    stop()

    expect(messages).toEqual(['Saved'])
  })

  it('auto dismisses non-loading notices', () => {
    notice.info('Ready', { duration: 100 })

    vi.advanceTimersByTime(100)

    expect(noticeItems).toHaveLength(0)
  })

  it('updates one loading notice to success', async () => {
    const task = notice.promise(Promise.resolve('track.mp3'), {
      loading: 'Saving',
      success: (name) => `Saved ${name}`,
      error: 'Save failed',
    })

    expect(noticeItems).toHaveLength(1)
    const id = noticeItems[0].id
    expect(noticeItems[0].type).toBe('loading')
    await expect(task).resolves.toBe('track.mp3')
    expect(noticeItems).toHaveLength(1)
    expect(noticeItems[0]).toMatchObject({ id, type: 'success', message: 'Saved track.mp3' })
  })

  it('updates one loading notice to an actionable error', async () => {
    const retry = vi.fn()
    const failure = new Error('offline')
    const task = notice.promise(Promise.reject(failure), {
      loading: 'Connecting',
      success: 'Connected',
      error: () => ({ message: 'Connection failed', action: { label: 'Retry', onClick: retry } }),
    })

    const id = noticeItems[0].id
    await expect(task).rejects.toBe(failure)
    expect(noticeItems).toHaveLength(1)
    expect(noticeItems[0]).toMatchObject({ id, type: 'error', message: 'Connection failed' })
    expect(noticeItems[0].action?.label).toBe('Retry')
  })

  it('lets only the newest same-id promise update the notice', async () => {
    const older = deferred<string>()
    const newer = deferred<string>()
    const options = (label: string) => ({
      id: 'sync',
      loading: `Loading ${label}`,
      success: (value: string) => `Saved ${value}`,
      error: (error: unknown) => `Failed ${String(error)}`,
    })
    const olderTask = notice.promise(older.promise, options('older'))
    const newerTask = notice.promise(newer.promise, options('newer'))

    newer.resolve('newer')
    await expect(newerTask).resolves.toBe('newer')
    expect(noticeItems[0]).toMatchObject({ id: 'sync', type: 'success', message: 'Saved newer' })

    older.resolve('older')
    await expect(olderTask).resolves.toBe('older')
    expect(noticeItems[0]).toMatchObject({ id: 'sync', type: 'success', message: 'Saved newer' })
  })

  it('does not let a dismissed promise take over a replacement with the same id', async () => {
    const pending = deferred<string>()
    const task = notice.promise(pending.promise, {
      id: 'sync',
      loading: 'Loading',
      success: 'Old success',
      error: 'Old failure',
    })

    notice.dismiss('sync')
    notice.info('Replacement', { id: 'sync', duration: 0 })
    pending.resolve('done')

    await expect(task).resolves.toBe('done')
    expect(noticeItems[0]).toMatchObject({ id: 'sync', type: 'info', message: 'Replacement' })
  })

  it('treats an explicit update as taking ownership from a pending promise', async () => {
    const pending = deferred<string>()
    const task = notice.promise(pending.promise, {
      id: 'sync',
      loading: 'Loading',
      success: 'Old success',
      error: 'Old failure',
    })

    notice.update('sync', { type: 'info', message: 'Managed elsewhere', duration: 0 })
    pending.resolve('done')

    await expect(task).resolves.toBe('done')
    expect(noticeItems[0]).toMatchObject({ id: 'sync', type: 'info', message: 'Managed elsewhere' })
  })
})
