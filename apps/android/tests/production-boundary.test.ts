import { builtinModules } from 'node:module'
import { describe, expect, it } from 'vitest'

import { collectModuleSpecifiers, forbiddenPatterns, isForbiddenModuleSpecifier } from '../scripts/forbidden-patterns.mjs'

const productionSources = {
  ...import.meta.glob(
    ['../src/**/*.{ts,tsx,js,jsx,vue}', '!../src/platform/browser.ts'],
    { eager: true, query: '?raw', import: 'default' }
  ),
  ...import.meta.glob('../android/app/src/main/**/*.{java,kt}', { eager: true, query: '?raw', import: 'default' })
} as Record<string, string>

const browserPreviewSources = import.meta.glob(
  '../src/platform/browser.ts',
  { eager: true, query: '?raw', import: 'default' }
) as Record<string, string>

const fixtureSources = import.meta.glob('./fixtures/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const sourceContentPatterns = forbiddenPatterns.filter(({ name }) => ![
  'Node import or runtime',
  'Browser preview adapter'
].includes(name))

describe('Android production source boundary', () => {
  it('scans production web and native sources only', () => {
    expect(Object.keys(productionSources).length).toBeGreaterThan(0)
    expect(Object.values(fixtureSources).join('\n')).toMatch(/fixture-only-secret/)
    expect(Object.values(browserPreviewSources).join('\n')).toContain('createBrowserPlatform')
    expect(Object.keys(productionSources).some(file => file.includes('/tests/'))).toBe(false)
    expect(Object.keys(productionSources).some(file => file.endsWith('/platform/browser.ts'))).toBe(false)
  })

  it('rejects static, dynamic, side-effect, and CommonJS platform imports', () => {
    for (const [file, source] of Object.entries(productionSources)) {
      expect(collectModuleSpecifiers(source).filter(isForbiddenModuleSpecifier), file).toEqual([])
    }

    const fixtureSpecifiers = collectModuleSpecifiers(Object.values(fixtureSources).join('\n'))
    expect(fixtureSpecifiers).toEqual(expect.arrayContaining([
      'electron',
      'electron-log',
      '@electron/remote',
      'electron/main',
      'electron/common',
      'electron/renderer',
      'electron/utility',
      'electron',
      'node:diagnostics_channel',
      'node:fs',
      'node:path',
      'child_process',
      'fs/promises',
      'fs'
    ]))
    expect(fixtureSpecifiers.filter(isForbiddenModuleSpecifier)).toHaveLength(fixtureSpecifiers.length)
    expect(collectModuleSpecifiers("import/*comment*/('electron')")).toEqual(['electron'])
    expect(collectModuleSpecifiers("require/*comment*/('fs')")).toEqual(['fs'])
  })

  it('rejects every Node builtin and Electron package family', () => {
    for (const builtin of builtinModules) {
      const normalized = builtin.replace(/^node:/, '')
      expect(isForbiddenModuleSpecifier(normalized), normalized).toBe(true)
      expect(isForbiddenModuleSpecifier(`node:${normalized}`), `node:${normalized}`).toBe(true)
      expect(isForbiddenModuleSpecifier(`${normalized}/promises`), `${normalized}/promises`).toBe(true)
    }
    for (const specifier of [
      'electron',
      'electron-log',
      'electron-updater',
      'electron/main',
      'electron/common',
      'electron/renderer',
      'electron/utility',
      '@electron/remote',
      '@electron/rebuild'
    ]) {
      expect(isForbiddenModuleSpecifier(specifier), specifier).toBe(true)
    }
  })

  it('rejects expanded development URLs and literal credentials without treating fixtures as production', () => {
    const fixtureSource = Object.values(fixtureSources).join('\n')
    const matchedLabels = forbiddenPatterns
      .filter(({ pattern }) => pattern.test(fixtureSource))
      .map(({ name }) => name)
    expect(matchedLabels).toEqual(expect.arrayContaining([
      'Electron package or runtime',
      'Node import or runtime',
      'Browser preview adapter',
      'development-server URL',
      'author-owned API default',
      'literal credential',
      'literal bearer or private key'
    ]))
  })

  it('covers every development host and credential category', () => {
    const developmentPattern = forbiddenPatterns.find(({ name }) => name === 'development-server URL')?.pattern
    const credentialPattern = forbiddenPatterns.find(({ name }) => name === 'literal credential')?.pattern
    const sensitiveMaterialPattern = forbiddenPatterns.find(({ name }) => name === 'literal bearer or private key')?.pattern
    expect(developmentPattern).toBeDefined()
    expect(credentialPattern).toBeDefined()
    expect(sensitiveMaterialPattern).toBeDefined()

    for (const url of [
      'http://localhost:4174',
      'http://127.0.0.2:3000',
      'http://0.0.0.0:8080',
      'http://10.0.2.2:4174',
      'http://10.20.30.40/api',
      'http://172.16.0.2/api',
      'http://192.168.1.20/api',
      'http://music-box.local:8080/api',
      'https://music-app.test/api',
      'http://[fd00::1]:8080/api'
    ]) expect(url).toMatch(developmentPattern!)

    for (const assignment of [
      "apiKey = 'literal-value'",
      "access_token = 'literal-value'",
      "clientSecret = 'literal-value'",
      "token = 'literal-value'",
      "secret = 'literal-value'",
      "password = 'literal-value'",
      "passwd = 'literal-value'",
      "cookie = 'literal-value'",
      "session = 'literal-value'"
    ]) expect(assignment).toMatch(credentialPattern!)

    expect('password = `literal-value`').toMatch(credentialPattern!)

    expect("Authorization = 'Bearer literal-value'").toMatch(sensitiveMaterialPattern!)
    expect('Authorization = `Basic bGl0ZXJhbDp2YWx1ZQ==`').toMatch(sensitiveMaterialPattern!)
    expect('-----BEGIN OPENSSH PRIVATE KEY-----').toMatch(sensitiveMaterialPattern!)
    expect('https://api.example.com/v1').not.toMatch(developmentPattern!)
  })

  it('keeps Browser preview code out of the production entry graph', () => {
    const main = productionSources['../src/main.ts']
    expect(main).toContain("import.meta.env.DEV")
    expect(main).toContain("await import('./platform/browser')")
    expect(main).toContain('createUnavailablePlatform()')
    expect(main).not.toContain("from './platform/browser'")
  })

  it.each(sourceContentPatterns)('contains no $name', ({ pattern }) => {
    for (const [file, source] of Object.entries(productionSources)) {
      expect(source, file).not.toMatch(pattern)
    }
  })
})
