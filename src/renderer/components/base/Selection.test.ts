import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Selection from './Selection.vue'

const items = [
  { id: 'disabled', name: 'Disabled', disabled: true },
  { id: 'alpha', name: 'Alpha' },
  { id: 'loading', name: 'Loading', loading: true },
  { id: 'beta', name: 'Beta' },
  { id: 'gamma', name: 'Gamma' },
]

const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

const mountSelection = (state: { disabled?: boolean; loading?: boolean } = {}) => {
  const value = ref('beta')
  const changes = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(Selection, {
        list: items,
        modelValue: value.value,
        itemKey: 'id',
        itemName: 'name',
        ariaLabel: 'Choose item',
        disabled: state.disabled,
        loading: state.loading,
        'onUpdate:modelValue': (nextValue: string) => {
          value.value = nextValue
        },
        onChange: changes,
      }),
  })
  app.mount(host)
  return { app, changes, host, value }
}

describe('Selection mounted keyboard interactions', () => {
  let apps: App[]

  beforeEach(() => {
    apps = []
    document.body.innerHTML = ''
  })

  afterEach(() => {
    apps.forEach((app) => app.unmount())
    document.body.innerHTML = ''
  })

  it('opens with Enter, navigates enabled options, selects, and restores trigger focus', async () => {
    const mounted = mountSelection()
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('[role="combobox"]')!

    trigger.focus()
    expect(keydown(trigger, 'Enter').defaultPrevented).toBe(true)
    await nextTick()
    let options = Array.from(mounted.host.querySelectorAll<HTMLElement>('[role="option"]'))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options[3].id)
    expect(options[0].getAttribute('aria-disabled')).toBe('true')
    expect(options[2].getAttribute('aria-disabled')).toBe('true')

    keydown(trigger, 'ArrowDown')
    await nextTick()
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options[4].id)

    keydown(trigger, 'Home')
    await nextTick()
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options[1].id)

    keydown(trigger, 'End')
    await nextTick()
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options[4].id)

    keydown(trigger, 'Enter')
    await nextTick()
    expect(mounted.value.value).toBe('gamma')
    expect(mounted.changes).toHaveBeenCalledWith(items[4])
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)

    keydown(trigger, ' ')
    await nextTick()
    options = Array.from(mounted.host.querySelectorAll<HTMLElement>('[role="option"]'))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    keydown(trigger, 'ArrowUp')
    await nextTick()
    expect(trigger.getAttribute('aria-activedescendant')).toBe(options[3].id)

    expect(keydown(trigger, 'Escape').defaultPrevented).toBe(true)
    await nextTick()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.hasAttribute('aria-activedescendant')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('restores focus after selecting an option that received focus', async () => {
    const mounted = mountSelection()
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('[role="combobox"]')!

    trigger.click()
    await nextTick()
    const option = mounted.host.querySelectorAll<HTMLElement>('[role="option"]')[1]
    option.setAttribute('tabindex', '-1')
    option.focus()
    expect(document.activeElement).toBe(option)

    option.click()
    await nextTick()
    expect(mounted.value.value).toBe('alpha')
    expect(mounted.changes).toHaveBeenCalledWith(items[1])
    expect(document.activeElement).toBe(trigger)
  })

  it.each([
    { state: { disabled: true }, busy: false },
    { state: { loading: true }, busy: true },
  ])('keeps a $state trigger natively disabled', async ({ state, busy }) => {
    const mounted = mountSelection(state)
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('[role="combobox"]')!

    trigger.focus()
    trigger.click()
    keydown(trigger, 'Enter')
    await nextTick()
    expect(trigger.disabled).toBe(true)
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.getAttribute('aria-busy')).toBe(busy ? 'true' : null)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).not.toBe(trigger)
    expect(mounted.changes).not.toHaveBeenCalled()
  })
})
