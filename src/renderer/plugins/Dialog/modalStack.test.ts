import { beforeEach, describe, expect, it, vi } from 'vitest'
import { focusModal, getFocusableElements, openModal, resetModalStack } from './modalStack'

const keydown = (key: string, shiftKey = false) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))

describe('modal keyboard and focus management', () => {
  beforeEach(() => {
    resetModalStack()
    document.body.innerHTML = ''
  })

  it('moves initial focus, loops Tab, closes on Escape and restores focus', () => {
    document.body.innerHTML = `
      <main id="app"><button id="trigger">Open</button></main>
      <div id="dialog" tabindex="-1"><button id="first">First</button><button id="last">Last</button></div>
    `
    const trigger = document.getElementById('trigger')! as HTMLButtonElement
    const dialog = document.getElementById('dialog')! as HTMLElement
    const first = document.getElementById('first')! as HTMLButtonElement
    const last = document.getElementById('last')! as HTMLButtonElement
    trigger.focus()
    let unregister = () => {}
    const close = vi.fn(() => unregister())

    unregister = openModal(dialog, close)
    focusModal(dialog, '#first')

    expect(document.activeElement).toBe(first)
    expect(document.getElementById('app')?.getAttribute('aria-hidden')).toBe('true')
    last.focus()
    keydown('Tab')
    expect(document.activeElement).toBe(first)
    first.focus()
    keydown('Tab', true)
    expect(document.activeElement).toBe(last)
    keydown('Escape')
    expect(close).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(trigger)
    expect(document.getElementById('app')?.hasAttribute('aria-hidden')).toBe(false)
  })

  it('gives only the top nested modal Escape handling', () => {
    document.body.innerHTML = `
      <button id="outer-trigger">Open outer</button>
      <div id="outer" tabindex="-1"><button id="inner-trigger">Open inner</button></div>
      <div id="inner" tabindex="-1"><button id="inner-action">Confirm</button></div>
    `
    const outerTrigger = document.getElementById('outer-trigger')! as HTMLButtonElement
    const outer = document.getElementById('outer')! as HTMLElement
    const innerTrigger = document.getElementById('inner-trigger')! as HTMLButtonElement
    const inner = document.getElementById('inner')! as HTMLElement
    outerTrigger.focus()
    let closeOuter = () => {}
    const outerHandler = vi.fn(() => closeOuter())
    closeOuter = openModal(outer, outerHandler)
    innerTrigger.focus()
    let closeInner = () => {}
    const innerHandler = vi.fn(() => closeInner())
    closeInner = openModal(inner, innerHandler)
    focusModal(inner)

    keydown('Escape')

    expect(innerHandler).toHaveBeenCalledOnce()
    expect(outerHandler).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(innerTrigger)
    expect(outer.inert).toBe(false)

    keydown('Escape')
    expect(outerHandler).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(outerTrigger)
  })

  it.each([
    ['display:none', 'display: none'],
    ['visibility:hidden', 'visibility: hidden'],
  ])('excludes controls inside an ancestor with %s', (_label, style) => {
    document.body.innerHTML = `
      <div id="dialog">
        <div style="${style}"><button id="hidden-action">Hidden action</button></div>
        <button id="visible-action">Visible action</button>
      </div>
    `

    const dialog = document.getElementById('dialog')! as HTMLElement

    expect(getFocusableElements(dialog).map((element) => element.id)).toEqual(['visible-action'])
  })

  it.each(['hidden', 'inert'])('excludes controls inside an ancestor with %s', (attribute) => {
    document.body.innerHTML = `
      <div id="dialog">
        <div ${attribute}><button id="hidden-action">Hidden action</button></div>
        <button id="visible-action">Visible action</button>
      </div>
    `

    const dialog = document.getElementById('dialog')! as HTMLElement

    expect(getFocusableElements(dialog).map((element) => element.id)).toEqual(['visible-action'])
  })
})
