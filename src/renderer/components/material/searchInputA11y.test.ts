import { describe, expect, it } from 'vitest'

import {
  createSearchCompositionState,
  finishSearchComposition,
  readSearchInput,
  startSearchComposition,
} from './searchInputA11y'

describe('SearchInput Chinese IME composition', () => {
  it('does not publish partial composition text and commits once at composition end', () => {
    const state = createSearchCompositionState()
    startSearchComposition(state)

    expect(readSearchInput(state, 'wang')).toEqual({ commit: false, value: 'wang' })
    expect(readSearchInput(state, '网易')).toEqual({ commit: false, value: '网易' })
    expect(finishSearchComposition(state, ' 网易云 ')).toBe('网易云')
    expect(readSearchInput(state, ' 网易云 ')).toEqual({ commit: false, value: '网易云' })
    expect(readSearchInput(state, '网易云音乐')).toEqual({ commit: true, value: '网易云音乐' })
  })
})
