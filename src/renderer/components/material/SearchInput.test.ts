import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { showAudioMatch } = vi.hoisted(() => ({
  showAudioMatch: vi.fn(),
}))

vi.mock('@common/utils/electron', () => ({
  clipboardReadText: () => '',
}))

vi.mock('@renderer/store/setting', () => ({
  appSetting: { 'search.isFocusSearchBox': false },
}))

vi.mock('@root/lang', () => ({
  useI18n: () => (key: string) => key,
}))

vi.mock('@renderer/core/useApp/useAudioMatch', () => ({
  showAudioMatch,
}))

import SearchInput from './SearchInput.vue'

const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

const mountSearchInput = () => {
  const value = ref('')
  const visible = ref(true)
  const updates = vi.fn((nextValue: string) => {
    value.value = nextValue
  })
  const events = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(SearchInput, {
        modelValue: value.value,
        list: ['网易云', 'QQ 音乐'],
        visibleList: visible.value,
        inputLabel: 'Search music',
        clearLabel: 'Clear search',
        searchLabel: 'Run search',
        audioMatchLabel: 'Identify song',
        'onUpdate:modelValue': updates,
        onEvent: events,
      }),
  })
  app.mount(host)
  return { app, events, host, updates, value, visible }
}

describe('SearchInput mounted accessibility interactions', () => {
  const originalKeyEvent = window.key_event
  let apps: App[]
  let keyEventOn: ReturnType<typeof vi.fn>
  let keyEventOff: ReturnType<typeof vi.fn>

  beforeEach(() => {
    apps = []
    keyEventOn = vi.fn()
    keyEventOff = vi.fn()
    document.body.innerHTML = ''
    window.key_event = { on: keyEventOn, off: keyEventOff } as unknown as typeof window.key_event
    showAudioMatch.mockClear()
  })

  afterEach(() => {
    apps.forEach((app) => app.unmount())
    window.key_event = originalKeyEvent
    document.body.innerHTML = ''
  })

  it('commits Chinese IME once and exposes active option state through the combobox', async () => {
    const mounted = mountSearchInput()
    apps.push(mounted.app)
    await nextTick()
    const input = mounted.host.querySelector<HTMLInputElement>('[role="combobox"]')!
    const buttons = Array.from(mounted.host.querySelectorAll<HTMLButtonElement>('button'))

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Clear search',
      'Run search',
      'Identify song',
    ])
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'wang'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.value = ' 网易云 '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(mounted.updates).not.toHaveBeenCalled()

    expect(keydown(input, 'ArrowDown').defaultPrevented).toBe(false)
    expect(keydown(input, 'Enter').defaultPrevented).toBe(false)
    await nextTick()
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(mounted.events).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submit' })
    )
    expect(mounted.events).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'listClick' })
    )

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(mounted.value.value).toBe('网易云')
    expect(mounted.updates).toHaveBeenCalledOnce()

    expect(keydown(input, 'ArrowDown').defaultPrevented).toBe(true)
    await nextTick()
    const options = Array.from(mounted.host.querySelectorAll<HTMLElement>('[role="option"]'))
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
    expect(options[0].getAttribute('aria-selected')).toBe('true')

    keydown(input, 'Enter')
    await nextTick()
    expect(mounted.events).toHaveBeenCalledWith({ action: 'listClick', data: 0 })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(input)
  })

  it('dismisses suggestions with Escape, retains input focus, and names icon actions', async () => {
    const mounted = mountSearchInput()
    apps.push(mounted.app)
    await nextTick()
    const input = mounted.host.querySelector<HTMLInputElement>('[role="combobox"]')!

    input.focus()
    keydown(input, 'ArrowDown')
    await nextTick()
    expect(input.hasAttribute('aria-activedescendant')).toBe(true)
    expect(keydown(input, 'Escape').defaultPrevented).toBe(true)
    await nextTick()
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.hasAttribute('aria-activedescendant')).toBe(false)
    expect(document.activeElement).toBe(input)

    mounted.host.querySelector<HTMLButtonElement>('[aria-label="Identify song"]')!.click()
    expect(showAudioMatch).toHaveBeenCalledOnce()
  })

  it('unregisters the same global hotkey callback when unmounted', () => {
    const mounted = mountSearchInput()
    const registration = keyEventOn.mock.calls[0]
    expect(registration).toHaveLength(2)

    mounted.app.unmount()
    expect(keyEventOff).toHaveBeenCalledOnce()
    expect(keyEventOff).toHaveBeenCalledWith(...registration)
  })
})
