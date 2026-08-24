import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createDesktopRcMatrix,
  DESKTOP_RC_PATHS,
  DESKTOP_RC_STATES,
  DESKTOP_RC_THEMES,
  DESKTOP_RC_VIEWPORTS,
} from './desktopRcMatrix.mjs'

const sha = 'a'.repeat(64)
const values = (rows, getValue) => new Set(rows.map(getValue))

describe('Desktop RC matrix', () => {
  it('covers every required viewport, theme, motion, language, fixture state, and workflow', () => {
    const rows = createDesktopRcMatrix(sha)
    assert.equal(rows.length, 24)
    assert.deepEqual(values(rows, (row) => `${row.display.viewport.width}x${row.display.viewport.height}`), new Set(DESKTOP_RC_VIEWPORTS))
    assert.deepEqual(values(rows, (row) => row.display.theme), new Set(DESKTOP_RC_THEMES))
    assert.deepEqual(values(rows, (row) => row.state), new Set(DESKTOP_RC_STATES))
    assert.deepEqual(values(rows, (row) => row.operationPath[2].target.split(' with ')[0]), new Set(DESKTOP_RC_PATHS))
    assert.deepEqual(values(rows, (row) => row.display.reducedMotion), new Set([false, true]))
    assert.deepEqual(values(rows, (row) => row.operationPath[1].target.split(',')[0]), new Set(['zh-CN-long', 'en-US-long']))
    assert.ok(rows.some((row) => row.display.fontScale === 1.25))
    assert.ok(rows.every((row) => row.result === 'PASS'))
    assert.ok(rows.every((row) => row.operationPath.every((action) => action.tool === 'agent-browser')))
  })
})
