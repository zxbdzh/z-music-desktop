export interface PreparationGate {
  isActive: () => boolean
  begin: () => number | null
  isCurrent: (token: number) => boolean
  finish: (token: number) => void
  cancel: () => void
}

export function createPreparationGate(): PreparationGate {
  const state = { generation: 0, active: false }
  return {
    isActive: () => state.active,
    begin: () => {
      if (state.active) return null
      state.active = true
      state.generation += 1
      return state.generation
    },
    isCurrent: (token) => state.active && token === state.generation,
    finish: (token) => {
      if (token === state.generation) state.active = false
    },
    cancel: () => {
      state.generation += 1
      state.active = false
    },
  }
}
