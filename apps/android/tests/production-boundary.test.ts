import { describe, expect, it } from 'vitest'

import { collectModuleSpecifiers, forbiddenModuleSpecifier, forbiddenPatterns } from '../scripts/forbidden-patterns.mjs'

const productionSources = {
  ...import.meta.glob('../src/**/*.{ts,tsx,js,jsx,vue}', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../android/app/src/main/**/*.{java,kt}', { eager: true, query: '?raw', import: 'default' })
} as Record<string, string>

const fixtureSources = import.meta.glob('./fixtures/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const sourceContentPatterns = forbiddenPatterns.filter(({ name }) => !['Electron runtime', 'Node import or runtime'].includes(name))

describe('Android production source boundary', () => {
  it('scans production web and native sources only', () => {
    expect(Object.keys(productionSources).length).toBeGreaterThan(0)
    expect(Object.values(fixtureSources).join('\n')).toMatch(/fixture-only-secret/)
    expect(Object.keys(productionSources).some(file => file.includes('/tests/'))).toBe(false)
  })

  it('rejects static, dynamic, side-effect, and CommonJS platform imports', () => {
    for (const [file, source] of Object.entries(productionSources)) {
      expect(collectModuleSpecifiers(source).filter(specifier => forbiddenModuleSpecifier.test(specifier)), file).toEqual([])
    }

    const fixtureSpecifiers = collectModuleSpecifiers(Object.values(fixtureSources).join('\n'))
    expect(fixtureSpecifiers).toEqual(expect.arrayContaining(['electron', 'node:fs', 'node:path', 'child_process']))
  })

  it.each(sourceContentPatterns)('contains no $name', ({ pattern }) => {
    for (const [file, source] of Object.entries(productionSources)) {
      expect(source, file).not.toMatch(pattern)
    }
  })
})
