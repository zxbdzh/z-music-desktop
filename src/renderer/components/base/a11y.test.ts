import { describe, expect, it } from 'vitest'

import {
  getControlState,
  getNextEnabledIndex,
  getPopupDismissal,
  isActivationKey,
  isComposingKeyEvent,
  restoreFocusIfOwned,
  shouldSubmitFromEnter,
} from './a11y'

describe('Btn keyboard state', () => {
  it('treats loading as disabled and exposes busy state', () => {
    expect(getControlState(false, true)).toEqual({ disabled: true, ariaBusy: 'true' })
    expect(getControlState(true, false)).toEqual({ disabled: true, ariaBusy: undefined })
  })

  it('recognises native Enter and Space activation keys', () => {
    expect(isActivationKey('Enter')).toBe(true)
    expect(isActivationKey(' ')).toBe(true)
    expect(isActivationKey('Escape')).toBe(false)
  })
})

describe('Input keyboard state', () => {
  it('does not submit while an IME composition is active', () => {
    const composing = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(composing, 'isComposing', { value: true })
    const imeKeyCode = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(imeKeyCode, 'keyCode', { value: 229 })

    expect(shouldSubmitFromEnter(composing)).toBe(false)
    expect(shouldSubmitFromEnter(imeKeyCode)).toBe(false)
    expect(shouldSubmitFromEnter(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true)
  })
})

describe('Tab keyboard sequence', () => {
  const disabled = (index: number) => index == 1 || index == 4

  it('moves horizontally, wraps, and skips disabled tabs', () => {
    expect(getNextEnabledIndex(5, 0, 'ArrowRight', disabled, 'horizontal')).toBe(2)
    expect(getNextEnabledIndex(5, 3, 'ArrowRight', disabled, 'horizontal')).toBe(0)
    expect(getNextEnabledIndex(5, 3, 'ArrowLeft', disabled, 'horizontal')).toBe(2)
  })

  it('supports vertical arrows and Home/End', () => {
    expect(getNextEnabledIndex(5, 2, 'ArrowDown', disabled, 'vertical')).toBe(3)
    expect(getNextEnabledIndex(5, 2, 'ArrowUp', disabled, 'vertical')).toBe(0)
    expect(getNextEnabledIndex(5, 2, 'Home', disabled, 'vertical')).toBe(0)
    expect(getNextEnabledIndex(5, 2, 'End', disabled, 'vertical')).toBe(3)
  })
})

describe('Selection and Menu keyboard sequence', () => {
  const unavailable = (index: number) => index == 0 || index == 2

  it('opens at the first available option and moves in both directions', () => {
    expect(getNextEnabledIndex(4, -1, 'ArrowDown', unavailable)).toBe(1)
    expect(getNextEnabledIndex(4, 1, 'ArrowDown', unavailable)).toBe(3)
    expect(getNextEnabledIndex(4, 3, 'ArrowDown', unavailable)).toBe(1)
    expect(getNextEnabledIndex(4, 1, 'ArrowUp', unavailable)).toBe(3)
  })

  it('keeps Home and End on enabled menu items', () => {
    expect(getNextEnabledIndex(4, 1, 'Home', unavailable)).toBe(1)
    expect(getNextEnabledIndex(4, 1, 'End', unavailable)).toBe(3)
  })

  it('closes on Escape and applies the correct Tab focus policy', () => {
    expect(getPopupDismissal('Escape', 'listbox')).toEqual({
      preventDefault: true,
      restoreFocus: true,
    })
    expect(getPopupDismissal('Escape', 'menu')).toEqual({
      preventDefault: true,
      restoreFocus: true,
    })
    expect(getPopupDismissal('Tab', 'listbox')).toEqual({
      preventDefault: false,
      restoreFocus: false,
    })
    expect(getPopupDismissal('Tab', 'menu')).toEqual({
      preventDefault: true,
      restoreFocus: true,
    })
  })

  it('restores menu focus without stealing focus from a newly opened control', () => {
    const opener = document.createElement('button')
    const menu = document.createElement('div')
    const menuItem = document.createElement('button')
    const nextControl = document.createElement('button')
    menu.append(menuItem)
    document.body.append(opener, menu, nextControl)

    menuItem.focus()
    expect(restoreFocusIfOwned(menu, opener)).toBe(true)
    expect(document.activeElement).toBe(opener)

    nextControl.focus()
    expect(restoreFocusIfOwned(menu, opener)).toBe(false)
    expect(document.activeElement).toBe(nextControl)
    opener.remove()
    menu.remove()
    nextControl.remove()
  })
})

describe('SearchInput keyboard sequence', () => {
  it('recognises composition key events independently of browser support', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    Object.defineProperty(event, 'isComposing', { value: true })
    expect(isComposingKeyEvent(event)).toBe(true)
  })
})
