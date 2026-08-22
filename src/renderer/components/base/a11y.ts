export type NavigationOrientation = 'horizontal' | 'vertical' | 'both'

type NavigationKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

const directionForKey = (key: string, orientation: NavigationOrientation): -1 | 0 | 1 => {
  if (key == 'Home') return 1
  if (key == 'End') return -1
  if (key == 'ArrowDown') return orientation == 'horizontal' ? 0 : 1
  if (key == 'ArrowUp') return orientation == 'horizontal' ? 0 : -1
  if (key == 'ArrowRight') return orientation == 'vertical' ? 0 : 1
  if (key == 'ArrowLeft') return orientation == 'vertical' ? 0 : -1
  return 0
}

export const isNavigationKey = (key: string): key is NavigationKey =>
  key == 'ArrowDown' ||
  key == 'ArrowUp' ||
  key == 'ArrowLeft' ||
  key == 'ArrowRight' ||
  key == 'Home' ||
  key == 'End'

export const getNextEnabledIndex = (
  length: number,
  currentIndex: number,
  key: string,
  isDisabled: (index: number) => boolean,
  orientation: NavigationOrientation = 'both'
): number => {
  if (!length || !isNavigationKey(key)) return -1

  const direction = directionForKey(key, orientation)
  if (!direction) return -1
  if (key == 'Home' || key == 'End') {
    const start = key == 'Home' ? 0 : length - 1
    for (let offset = 0; offset < length; offset++) {
      const index = key == 'Home' ? start + offset : start - offset
      if (index >= 0 && index < length && !isDisabled(index)) return index
    }
    return -1
  }

  const start = currentIndex >= 0 && currentIndex < length ? currentIndex : direction > 0 ? -1 : length
  for (let offset = 1; offset <= length; offset++) {
    const index = (start + direction * offset + length * 2) % length
    if (!isDisabled(index)) return index
  }
  return -1
}

export const getFirstEnabledIndex = (
  length: number,
  isDisabled: (index: number) => boolean
): number => getNextEnabledIndex(length, -1, 'ArrowDown', isDisabled, 'both')

export const isActivationKey = (key: string): boolean => key == 'Enter' || key == ' '

export const isComposingKeyEvent = (event: KeyboardEvent): boolean =>
  event.isComposing || event.keyCode == 229

export const shouldSubmitFromEnter = (event: KeyboardEvent): boolean =>
  event.key == 'Enter' && !isComposingKeyEvent(event)

export type PopupKind = 'listbox' | 'menu'

export const getPopupDismissal = (key: string, kind: PopupKind) => {
  if (key == 'Escape') return { preventDefault: true, restoreFocus: true }
  if (key == 'Tab') {
    return kind == 'menu'
      ? { preventDefault: true, restoreFocus: true }
      : { preventDefault: false, restoreFocus: false }
  }
  return null
}

export const restoreFocusIfOwned = (
  container: HTMLElement | null,
  target: HTMLElement | null
): boolean => {
  if (!target?.isConnected) return false
  const activeElement = document.activeElement
  if (
    activeElement != document.body &&
    activeElement != container &&
    !container?.contains(activeElement)
  )
    return false
  target.focus()
  return document.activeElement == target
}

export const getControlState = (disabled: boolean, loading: boolean) => ({
  disabled: disabled || loading,
  ariaBusy: loading ? 'true' : undefined,
})
