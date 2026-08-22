interface ModalEntry {
  element: HTMLElement
  restoreFocus: HTMLElement | null
  onEscape: () => void
}

interface IsolatedState {
  ariaHidden: string | null
  inert: boolean
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

const stack: ModalEntry[] = []
const isolatedElements = new Map<HTMLElement, IsolatedState>()
let listening = false

const isVisible = (element: HTMLElement) => {
  let current: HTMLElement | null = element
  while (current) {
    const style = window.getComputedStyle(current)
    if (
      current.hidden ||
      current.inert ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse'
    ) {
      return false
    }
    current = current.parentElement
  }
  return true
}

export const getFocusableElements = (element: HTMLElement) =>
  Array.from(element.querySelectorAll<HTMLElement>(focusableSelector)).filter(isVisible)

const restoreIsolation = () => {
  for (const [element, state] of isolatedElements) {
    if (state.ariaHidden == null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', state.ariaHidden)
    element.inert = state.inert
  }
  isolatedElements.clear()
}

const isolate = (element: HTMLElement) => {
  if (!isolatedElements.has(element)) {
    isolatedElements.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    })
  }
  element.setAttribute('aria-hidden', 'true')
  element.inert = true
}

const isolateOutside = (element: HTMLElement) => {
  restoreIsolation()
  let branch: HTMLElement | null = element
  while (branch?.parentElement) {
    for (const sibling of Array.from(branch.parentElement.children)) {
      if (sibling !== branch && sibling instanceof HTMLElement) isolate(sibling)
    }
    branch = branch.parentElement
    if (branch === document.body) break
  }
}

const syncIsolation = () => {
  const top = stack.at(-1)
  if (top) isolateOutside(top.element)
  else restoreIsolation()
}

const handleKeydown = (event: KeyboardEvent) => {
  const top = stack.at(-1)
  if (!top) return

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    top.onEscape()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements(top.element)
  if (!focusable.length) {
    event.preventDefault()
    top.element.focus()
    return
  }

  const first = focusable[0]
  const last = focusable.at(-1)!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !top.element.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !top.element.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

const syncListener = () => {
  if (stack.length && !listening) {
    document.addEventListener('keydown', handleKeydown, true)
    listening = true
  } else if (!stack.length && listening) {
    document.removeEventListener('keydown', handleKeydown, true)
    listening = false
  }
}

export const openModal = (element: HTMLElement, onEscape: () => void) => {
  const entry: ModalEntry = {
    element,
    restoreFocus:
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    onEscape,
  }
  stack.push(entry)
  syncListener()
  syncIsolation()

  return () => {
    const index = stack.indexOf(entry)
    if (index < 0) return
    const wasTop = index === stack.length - 1
    stack.splice(index, 1)
    syncListener()
    syncIsolation()
    if (wasTop && entry.restoreFocus?.isConnected) entry.restoreFocus.focus()
  }
}

export const focusModal = (element: HTMLElement, initialFocus?: string) => {
  const requested = initialFocus ? element.querySelector<HTMLElement>(initialFocus) : null
  const target =
    requested ??
    element.querySelector<HTMLElement>('[autofocus], [data-modal-initial-focus]') ??
    getFocusableElements(element)[0] ??
    element
  target.focus()
}

export const resetModalStack = () => {
  stack.length = 0
  syncListener()
  restoreIsolation()
}
