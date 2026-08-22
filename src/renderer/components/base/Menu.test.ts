import { createApp, h, nextTick, reactive, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@renderer/store/setting', () => ({
  appSetting: { 'download.enable': true },
}))

vi.mock('@renderer/utils/compositions/useMenuLocation', () => ({
  default: () => ({
    dom_menu: ref<HTMLElement | null>(null),
    menuStyles: reactive({}),
  }),
}))

import Menu from './Menu.vue'

const menus = [
  { action: 'hidden', name: 'Hidden', hide: true },
  { action: 'disabled', name: 'Disabled', disabled: true },
  { action: 'first', name: 'First' },
  { action: 'loading', name: 'Loading', loading: true },
  { action: 'last', name: 'Last' },
]

const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

const mountMenu = () => {
  const open = ref(false)
  const selections = vi.fn()
  const location = reactive<{ x: number; y: number; trigger: HTMLElement | null }>({
    x: 10,
    y: 10,
    trigger: null,
  })
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h('div', [
        h(
          'div',
          {
            id: 'menu-trigger',
            onContextmenu: (event: MouseEvent) => {
              event.preventDefault()
              location.trigger = event.currentTarget as HTMLElement
              open.value = true
            },
          },
          'Open menu'
        ),
        h(Menu, {
          modelValue: open.value,
          xy: location,
          menus,
          'onUpdate:modelValue': (value: boolean) => {
            open.value = value
          },
          onMenuClick: selections,
        }),
      ]),
  })
  app.mount(host)
  return { app, host, location, open, selections }
}

const openContextMenu = (trigger: HTMLElement) => {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  trigger.dispatchEvent(event)
  return event
}

describe('Menu mounted keyboard interactions', () => {
  let apps: App[]

  beforeEach(() => {
    apps = []
    document.body.innerHTML = '<div id="root"></div>'
  })

  afterEach(() => {
    apps.forEach((app) => app.unmount())
    document.body.innerHTML = ''
  })

  it('focuses the first enabled item and navigates with arrows, Home, and End', async () => {
    const mounted = mountMenu()
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLElement>('#menu-trigger')!
    expect(trigger.hasAttribute('tabindex')).toBe(false)
    expect(openContextMenu(trigger).defaultPrevented).toBe(true)
    await nextTick()
    await nextTick()
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))

    expect(menu.getAttribute('aria-hidden')).toBe('false')
    expect(document.activeElement).toBe(buttons[2])
    expect(buttons[1].disabled).toBe(true)
    expect(buttons[3].disabled).toBe(true)
    expect(buttons[3].getAttribute('aria-busy')).toBe('true')
    expect(buttons.filter((button) => button.tabIndex == 0)).toEqual([buttons[2]])

    keydown(buttons[2], 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(buttons[4])

    keydown(buttons[4], 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(buttons[2])

    keydown(buttons[2], 'End')
    await nextTick()
    expect(document.activeElement).toBe(buttons[4])

    keydown(buttons[4], 'Home')
    await nextTick()
    expect(document.activeElement).toBe(buttons[2])

    keydown(buttons[2], 'ArrowUp')
    await nextTick()
    expect(document.activeElement).toBe(buttons[4])
    expect(buttons.filter((button) => button.tabIndex == 0)).toEqual([buttons[4]])
  })

  it.each(['Enter', ' '] as const)('activates an item with %s and restores context trigger focus', async (key) => {
    const mounted = mountMenu()
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLElement>('#menu-trigger')!
    openContextMenu(trigger)
    await nextTick()
    await nextTick()
    const first = document.querySelector<HTMLButtonElement>('[aria-label="First"]')!

    const activationEvent = keydown(first, key)
    await nextTick()
    await nextTick()
    expect(activationEvent.defaultPrevented).toBe(true)
    expect(mounted.open.value).toBe(false)
    expect(mounted.selections).toHaveBeenCalledOnce()
    expect(mounted.selections).toHaveBeenCalledWith(menus[2])
    expect(document.activeElement).toBe(trigger)
    expect(trigger.hasAttribute('tabindex')).toBe(false)
  })

  it('updates the restore target when an open menu moves to another context trigger', async () => {
    const mounted = mountMenu()
    apps.push(mounted.app)
    const firstTrigger = mounted.host.querySelector<HTMLElement>('#menu-trigger')!
    const secondTrigger = document.createElement('div')
    document.body.append(secondTrigger)

    openContextMenu(firstTrigger)
    await nextTick()
    await nextTick()
    mounted.location.trigger = secondTrigger
    await nextTick()
    const first = document.querySelector<HTMLButtonElement>('[aria-label="First"]')!
    keydown(first, 'Escape')
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(secondTrigger)
    expect(secondTrigger.hasAttribute('tabindex')).toBe(false)
  })

  it('closes on Escape and restores context trigger focus without activating unavailable items', async () => {
    const mounted = mountMenu()
    apps.push(mounted.app)
    const trigger = mounted.host.querySelector<HTMLElement>('#menu-trigger')!
    openContextMenu(trigger)
    await nextTick()
    await nextTick()
    const disabled = document.querySelector<HTMLButtonElement>('[aria-label="Disabled"]')!
    const loading = document.querySelector<HTMLButtonElement>('[aria-label="Loading"]')!
    const first = document.querySelector<HTMLButtonElement>('[aria-label="First"]')!

    disabled.click()
    loading.click()
    expect(mounted.selections).not.toHaveBeenCalled()
    expect(keydown(first, 'Escape').defaultPrevented).toBe(true)
    await nextTick()
    await nextTick()
    expect(mounted.open.value).toBe(false)
    expect(mounted.selections).toHaveBeenCalledOnce()
    expect(mounted.selections).toHaveBeenCalledWith(null)
    expect(document.activeElement).toBe(trigger)
    expect(trigger.hasAttribute('tabindex')).toBe(false)
  })
})
