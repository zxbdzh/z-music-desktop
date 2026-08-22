import { describe, expect, it } from 'vitest'

const sourceFiles = import.meta.glob('../src/**/*.{ts,vue}', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const sharedCoreFiles = import.meta.glob(
  ['../../../src/common/mobile/*.ts', '!../../../src/common/mobile/*.test.ts'],
  { eager: true, query: '?raw', import: 'default' }
) as Record<string, string>

describe('Android web shell boundaries', () => {
  it('does not import Electron or Node APIs', () => {
    const forbiddenImport = /(?:from\s*|import\s*\()(['"])(?:electron|node:|fs(?:\/|['"]|$)|path(?:\/|['"]|$)|child_process(?:\/|['"]|$))/i
    for (const [file, source] of Object.entries(sourceFiles)) {
      expect(source, file).not.toMatch(forbiddenImport)
    }
  })

  it('keeps the shared core free of platform imports', () => {
    for (const [file, source] of Object.entries(sharedCoreFiles)) {
      const importSpecifiers = Array.from(
        source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g),
        (match) => match[2]
      )
      importSpecifiers.push(
        ...Array.from(source.matchAll(/\bimport\s*(['"])([^'"]+)\1/g), (match) => match[2])
      )
      expect(importSpecifiers, file).toEqual(
        importSpecifiers.filter(
          (specifier) => specifier.startsWith('./') && !specifier.slice(2).includes('/')
        )
      )
    }
  })

  it('keeps the frozen top-level navigation in the app shell', async () => {
    const appSource = sourceFiles['../src/App.vue']
    expect(appSource).toContain("label: '首页'")
    expect(appSource).toContain("label: '发现'")
    expect(appSource).toContain("label: '音乐库'")
    expect(appSource).toContain("label: '播客'")
    expect(appSource).toContain("label: '报告'")
    expect(appSource).toContain("label: '设置'")
  })
})
