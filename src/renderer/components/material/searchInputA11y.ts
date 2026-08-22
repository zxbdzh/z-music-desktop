export interface SearchCompositionState {
  composing: boolean
  skipInputValue: string | null
}

export const createSearchCompositionState = (): SearchCompositionState => ({
  composing: false,
  skipInputValue: null,
})

export const startSearchComposition = (state: SearchCompositionState): void => {
  state.composing = true
  state.skipInputValue = null
}

export const finishSearchComposition = (
  state: SearchCompositionState,
  rawValue: string
): string => {
  state.composing = false
  const value = rawValue.trim()
  state.skipInputValue = value
  return value
}

export const readSearchInput = (
  state: SearchCompositionState,
  rawValue: string
): { commit: boolean; value: string } => {
  if (state.composing) return { commit: false, value: rawValue }
  const value = rawValue.trim()
  if (state.skipInputValue == value) {
    state.skipInputValue = null
    return { commit: false, value }
  }
  state.skipInputValue = null
  return { commit: true, value }
}
