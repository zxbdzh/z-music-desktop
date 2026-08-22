import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Tab from './Tab.vue'

const items = [
  { id: 'disabled', label: 'Disabled', disabled: true },
  { id: 'alpha', label: 'Alpha', controls: 'panel-alpha' },
  { id: 'loading', label: 'Loading', loading: true },
  { id: 'beta', label: 'Beta' },
  { id: 'gamma', label: 'Gamma' },
  { id: 'disabled-end', label: 'Disabled end', disabled: true },
]

const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

const mountTab = (orientation: 'horizontal' | 'vertical' = 'horizontal') => {
  const value = ref('alpha')
  const changes = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(Tab, {
        list: items,
        modelValue: value.value,
        orientation,
        itemControls: 'controls',
        'onUpdate:modelValue': (nextValue: string) => {
          value.value = nextValue
        },
        onChange: changes,
      }),
  })
  app.mount(host)
  return { app, changes, host, value }
}

describe('Tab mounted keyboard interactions', () => {
  let apps: App[]

  beforeEach(() => {
    apps = []
    document.body.innerHTML = ''
  })

  afterEach(() => {
    apps.forEach((app) => app.unmount())
    document.body.innerHTML = ''
  })

  it('moves horizontally, wraps, skips unavailable tabs, and maintains one tab stop', async () => {
    const mounted = mountTab()
    apps.push(mounted.app)
    const tablist = mounted.host.querySelector<HTMLElement>('[role="tablist"]')!
    const tabs = Array.from(mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]'))

    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1])
    expect(tabs[0].disabled).toBe(true)
    expect(tabs[0].getAttribute('aria-disabled')).toBe('true')
    expect(tabs[2].disabled).toBe(true)
    expect(tabs[2].getAttribute('aria-busy')).toBe('true')
    expect(tabs[1].getAttribute('aria-controls')).toBe('panel-alpha')

    tabs[1].focus()
    expect(keydown(tabs[1], 'ArrowRight').defaultPrevented).toBe(true)
    await nextTick()
    expect(document.activeElement).toBe(tabs[3])
    expect(mounted.value.value).toBe('beta')
    expect(tabs[3].tabIndex).toBe(0)
    expect(tabs[3].getAttribute('aria-selected')).toBe('true')

    keydown(tabs[3], 'End')
    await nextTick()
    expect(document.activeElement).toBe(tabs[4])
    expect(tabs[4].tabIndex).toBe(0)

    keydown(tabs[4], 'ArrowRight')
    await nextTick()
    expect(document.activeElement).toBe(tabs[1])

    keydown(tabs[1], 'ArrowLeft')
    await nextTick()
    expect(document.activeElement).toBe(tabs[4])

    keydown(tabs[4], 'Home')
    await nextTick()
    expect(document.activeElement).toBe(tabs[1])
    expect(tabs.filter((tab) => tab.tabIndex == 0)).toEqual([tabs[1]])
    expect(mounted.changes.mock.calls.map(([value]) => value)).toEqual([
      'beta',
      'gamma',
      'alpha',
      'gamma',
      'alpha',
    ])
  })

  it('uses vertical arrows and leaves horizontal arrows unhandled', async () => {
    const mounted = mountTab('vertical')
    apps.push(mounted.app)
    const tabs = Array.from(mounted.host.querySelectorAll<HTMLButtonElement>('[role="tab"]'))

    expect(mounted.host.querySelector('[role="tablist"]')?.getAttribute('aria-orientation')).toBe(
      'vertical'
    )
    tabs[1].focus()
    keydown(tabs[1], 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(tabs[3])

    keydown(tabs[3], 'ArrowUp')
    await nextTick()
    expect(document.activeElement).toBe(tabs[1])

    const horizontalEvent = keydown(tabs[1], 'ArrowRight')
    await nextTick()
    expect(horizontalEvent.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(tabs[1])
    expect(mounted.value.value).toBe('alpha')
  })
})
