import { createApp, h, nextTick, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsSearch from './SettingsSearch.vue'
import { moveSearchSelection, searchSettings, type SettingSearchItem } from './settingsSearch'

const items: SettingSearchItem[] = [
  { id: 'SettingWy', groupId: 'account', groupTitle: '账户与服务', title: '网易云', description: '连接服务', keywords: ['cloud'] },
  { id: 'SettingPlay', groupId: 'playback', groupTitle: '播放体验', title: '播放设置', description: '自动播放', keywords: ['player'] },
]
const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}
const mountSearch = () => {
  const selected = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ render: () => h(SettingsSearch, {
    items, label: '搜索设置', placeholder: '搜索', clearLabel: '清除', emptyLabel: '没有结果', onSelect: selected,
  }) })
  app.mount(host)
  return { app, host, selected }
}

describe('SettingsSearch mounted keyboard interactions', () => {
  let apps: App[]
  beforeEach(() => { apps = []; document.body.innerHTML = '' })
  afterEach(() => { apps.forEach((app) => app.unmount()); document.body.innerHTML = '' })

  it('matches Chinese and English terms and wraps keyboard selection', () => {
    expect(searchSettings(items, '网易')).toEqual([items[0]])
    expect(searchSettings(items, 'CLOUD')).toEqual([items[0]])
    expect(searchSettings(items, '不存在')).toEqual([])
    expect(moveSearchSelection(-1, 'ArrowDown', 2)).toBe(0)
    expect(moveSearchSelection(0, 'ArrowUp', 2)).toBe(1)
    expect(moveSearchSelection(0, 'End', 2)).toBe(1)
  })

  it('does not navigate during Chinese IME and selects through the listbox after composition', async () => {
    const mounted = mountSearch(); apps.push(mounted.app)
    const input = mounted.host.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'wang'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(keydown(input, 'ArrowDown').defaultPrevented).toBe(false)
    expect(keydown(input, 'Enter').defaultPrevented).toBe(false)
    expect(mounted.selected).not.toHaveBeenCalled()

    input.value = '网易'
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(keydown(input, 'ArrowDown').defaultPrevented).toBe(true)
    await nextTick()
    const option = mounted.host.querySelector<HTMLElement>('[role="option"]')!
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id)
    expect(option.getAttribute('aria-selected')).toBe('true')
    expect(keydown(input, 'Enter').defaultPrevented).toBe(true)
    await nextTick()
    expect(mounted.selected).toHaveBeenCalledWith(items[0])
    expect(document.activeElement).toBe(input)
  })

  it('announces no results and dismisses the list with Escape', async () => {
    const mounted = mountSearch(); apps.push(mounted.app)
    const input = mounted.host.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.value = 'missing'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(mounted.host.querySelector('[role="status"]')?.textContent).toBe('没有结果')
    expect(keydown(input, 'Escape').defaultPrevented).toBe(true)
    await nextTick()
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(mounted.host.querySelector('[role="listbox"]')).toBeNull()
  })
})
