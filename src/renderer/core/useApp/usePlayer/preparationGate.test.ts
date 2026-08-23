import { describe, expect, it } from 'vitest'
import { createPreparationGate } from './preparationGate'

describe('createPreparationGate', () => {
  it('rejects re-entry while one preparation owns the gate', () => {
    const gate = createPreparationGate()
    const token = gate.begin()
    expect(token).not.toBeNull()
    expect(gate.isActive()).toBe(true)
    expect(gate.begin()).toBeNull()
  })

  it('invalidates an old token when cancelled', () => {
    const gate = createPreparationGate()
    const token = gate.begin()!
    gate.cancel()
    expect(gate.isCurrent(token)).toBe(false)
    expect(gate.isActive()).toBe(false)
  })

  it('allows only the current owner to finish the gate', () => {
    const gate = createPreparationGate()
    const first = gate.begin()!
    gate.cancel()
    const second = gate.begin()!
    gate.finish(first)
    expect(gate.isCurrent(second)).toBe(true)
    gate.finish(second)
    expect(gate.isActive()).toBe(false)
    expect(gate.begin()).not.toBeNull()
  })
})
