import { createApp, h, nextTick, ref, type App } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@common/utils/electron', () => ({
  clipboardReadText: () => '',
}))

import Btn from './Btn.vue'
import Input from './Input.vue'

const keydown = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('mounted native form controls', () => {
  let apps: App[]

  beforeEach(() => {
    apps = []
    document.body.innerHTML = ''
  })

  afterEach(() => {
    apps.forEach((app) => app.unmount())
    document.body.innerHTML = ''
  })

  it('keeps Btn enabled controls focusable and loading controls natively disabled', () => {
    const clicks = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h('div', [
          h(Btn, { type: 'submit', onClick: clicks }, () => 'Submit'),
          h(Btn, { loading: true, onClick: clicks }, () => 'Loading'),
          h(Btn, { disabled: true, onClick: clicks }, () => 'Disabled'),
        ]),
    })
    apps.push(app)
    app.mount(host)
    const [enabled, loading, disabled] = Array.from(host.querySelectorAll('button'))

    expect(enabled.type).toBe('submit')
    enabled.focus()
    enabled.click()
    expect(document.activeElement).toBe(enabled)
    expect(clicks).toHaveBeenCalledOnce()

    loading.focus()
    loading.click()
    disabled.click()
    expect(loading.disabled).toBe(true)
    expect(loading.getAttribute('aria-disabled')).toBe('true')
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(disabled.disabled).toBe(true)
    expect(disabled.getAttribute('aria-busy')).toBe(null)
    expect(document.activeElement).not.toBe(loading)
    expect(clicks).toHaveBeenCalledOnce()
  })

  it('keeps Input loading state disabled and submits only after IME composition ends', async () => {
    const value = ref('')
    const updates = vi.fn((nextValue: string) => {
      value.value = nextValue
    })
    const submits = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h('div', [
          h(Input, {
            modelValue: value.value,
            ariaLabel: 'Query',
            'onUpdate:modelValue': updates,
            onSubmit: submits,
          }),
          h(Input, { modelValue: '', ariaLabel: 'Loading query', loading: true }),
          h(Input, { modelValue: '', ariaLabel: 'Disabled query', disabled: true }),
        ]),
    })
    apps.push(app)
    app.mount(host)
    const [input, loading, disabled] = Array.from(
      host.querySelectorAll<HTMLInputElement>('input')
    )

    input.focus()
    expect(document.activeElement).toBe(input)
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'wang'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    keydown(input, 'Enter')
    expect(submits).not.toHaveBeenCalled()

    input.value = ' 网易云 '
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    expect(keydown(input, 'Enter').defaultPrevented).toBe(true)
    expect(submits).toHaveBeenCalledOnce()
    expect(submits).toHaveBeenCalledWith('网易云')
    expect(updates).toHaveBeenCalledWith('wang')

    loading.focus()
    expect(loading.disabled).toBe(true)
    expect(loading.getAttribute('aria-disabled')).toBe('true')
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(document.activeElement).not.toBe(loading)

    disabled.focus()
    expect(disabled.disabled).toBe(true)
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    expect(disabled.getAttribute('aria-busy')).toBe(null)
    expect(document.activeElement).not.toBe(disabled)
  })
})
