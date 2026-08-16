import { describe, expect, it } from 'vitest'

const productionSources = {
  ...import.meta.glob('../src/**/*.{ts,tsx,js,jsx,vue}', { eager: true, query: '?raw', import: 'default' }),
  ...import.meta.glob('../android/app/src/main/**/*.{java,kt}', { eager: true, query: '?raw', import: 'default' })
} as Record<string, string>

const fixtureSources = import.meta.glob('./fixtures/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const forbiddenPatterns: Array<[string, RegExp]> = [
  ['Electron or Node import', /(?:from\s*|import\s*\()(['"])(?:electron|node:|fs(?:\/|['"]|$)|path(?:\/|['"]|$)|child_process(?:\/|['"]|$))/i],
  ['development URL', /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/|['"`]|$)/i],
  ['author-owned API default', /https?:\/\/(?:[^/'"`]+\.)?(?:ikunshare\.github\.io|lxmusic\.toside\.cn|music\.zxbdwy\.online)(?:\/|['"`]|$)/i],
  ['literal credential', /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd)\s*[:=]\s*['"][^'"]{4,}['"]/i],
  ['literal bearer credential', /(?:authorization\s*[:=]\s*['"]bearer\s+|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/i]
]

describe('Android production source boundary', () => {
  it('scans production web and native sources only', () => {
    expect(Object.keys(productionSources).length).toBeGreaterThan(0)
    expect(Object.values(fixtureSources).join('\n')).toMatch(/fixture-only-secret/)
    expect(Object.keys(productionSources).some(file => file.includes('/tests/'))).toBe(false)
  })

  it.each(forbiddenPatterns)('contains no %s', (_label, pattern) => {
    for (const [file, source] of Object.entries(productionSources)) {
      expect(source, file).not.toMatch(pattern)
    }
  })
})
