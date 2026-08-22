import { createApp, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NoticeHost from './NoticeHost.vue'
import { notice, noticeItems, resetNoticeState } from './index'

describe('NoticeHost', () => {
  beforeEach(() => {
    resetNoticeState()
    document.body.innerHTML = '<div id="host"></div>'
  })

  afterEach(() => {
    resetNoticeState()
    document.body.innerHTML = ''
  })

  const mountHost = () => {
    const app = createApp(NoticeHost)
    app.mount('#host')
    return app
  }

  const findAction = (label: string) =>
    Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === label
    )!

  it('dismisses a normal one-shot action after invoking it', async () => {
    const retry = vi.fn()
    const app = mountHost()
    notice.error('Connection failed', {
      duration: 0,
      action: { label: 'Retry', onClick: retry },
    })
    await nextTick()

    const liveRegion = document.querySelector<HTMLElement>('section[aria-live="polite"]')
    const action = findAction('Retry')
    action.focus()

    expect(liveRegion?.getAttribute('aria-relevant')).toBe('additions text')
    expect(document.activeElement).toBe(action)
    action.click()
    await nextTick()
    expect(retry).toHaveBeenCalledOnce()
    expect(noticeItems).toHaveLength(0)
    app.unmount()
  })

  it('keeps a same-id retry mounted when the action replaces it with a loading promise', async () => {
    const app = mountHost()
    const id = 'connection'
    const pending = new Promise<string>(() => {})
    notice.error('Connection failed', {
      id,
      duration: 0,
      action: {
        label: 'Retry',
        onClick: () => {
          void notice.promise(pending, {
            id,
            loading: 'Retrying connection',
            success: 'Connected',
            error: 'Connection failed',
          })
        },
      },
    })
    await nextTick()

    findAction('Retry').click()
    await nextTick()

    expect(noticeItems).toHaveLength(1)
    expect(noticeItems[0]).toMatchObject({ id, type: 'loading', message: 'Retrying connection' })
    expect(document.querySelectorAll('article')).toHaveLength(1)
    expect(document.querySelector('article')?.textContent).toContain('Retrying connection')
    app.unmount()
  })
})
