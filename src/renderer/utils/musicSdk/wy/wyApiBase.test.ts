import { describe, expect, it } from 'vitest'

import {
  MAX_WY_API_BASE_URL_LENGTH,
  LIBRARY_LOCATIONS,
  normalizeWyApiBaseUrl,
  validateWyApiBaseUrl,
  type MediaItem,
  type OperationResult,
} from './wyApiBase'
import {
  normalizeWyApiBaseUrl as normalizeSharedWyApiBaseUrl,
  validateWyApiBaseUrl as validateSharedWyApiBaseUrl,
} from '@common/mobile'

describe('wy api base url', () => {
  it('preserves a deployment path and removes trailing slashes', () => {
    expect(normalizeWyApiBaseUrl('https://api.example.test/netease///')).toBe(
      'https://api.example.test/netease'
    )
    expect(normalizeWyApiBaseUrl('https://api.example.test/tenant%20one/v1;stable/')).toBe(
      'https://api.example.test/tenant%20one/v1;stable'
    )
  })

  it('accepts HTTPS and exact loopback HTTP URLs', () => {
    expect(validateWyApiBaseUrl('http://localhost:3000').valid).toBe(true)
    expect(validateWyApiBaseUrl('http://127.0.0.1:3000/api').valid).toBe(true)
    expect(validateWyApiBaseUrl('http://[::1]:3000/api/').value).toBe(
      'http://[::1]:3000/api'
    )
    expect(validateWyApiBaseUrl('https://example.test:8443/api').value).toBe(
      'https://example.test:8443/api'
    )
  })

  it.each([
    'http://10.0.0.1',
    'http://172.16.0.1',
    'http://192.168.1.1',
    'http://example.test',
    'http://localhost.example.test',
    'http://localhost.',
    'http://127.0.0.1.example.test',
    'http://127.1',
    'http://127.0.0.01',
    'http://2130706433',
    'http://0x7f000001',
    'http://[0:0:0:0:0:0:0:1]',
  ])('rejects non-exact or non-loopback HTTP hosts: %s', (input) => {
    expect(validateWyApiBaseUrl(input).error).toBe('insecure_http_not_allowed')
  })

  it.each([
    ' https://example.test/base',
    'https://example.test/base ',
    'https://example.test/\u00a0base',
    'https://example.test/\u3000base',
    '\ufeffhttps://example.test/base',
  ])('rejects whitespace before URL parsing: %s', (input) => {
    expect(validateWyApiBaseUrl(input).error).toBe('whitespace')
  })

  it.each(['\u0000https://example.test', 'https://example.test/\u007f', 'https://example.test/\u0085'])(
    'rejects control characters before URL parsing: %s',
    (input) => {
      expect(validateWyApiBaseUrl(input).error).toBe('control_characters')
    }
  )

  it.each([
    'ftp://example.test',
    'https://user:password@example.test',
    'https://example.test?token=secret',
    'https://example.test?',
    'https://example.test/path#fragment',
    'https://example.test#',
    'https://example.test/with space',
    'https://example.test/\u0000',
    '\nhttps://example.test',
    'not a url',
    '',
  ])('rejects unsafe or malformed input: %s', (input) => {
    expect(validateWyApiBaseUrl(input).valid).toBe(false)
    expect(normalizeWyApiBaseUrl(input)).toBe('')
  })

  it('rejects an address over the configured maximum length', () => {
    const input = `https://example.test/${'a'.repeat(MAX_WY_API_BASE_URL_LENGTH)}`
    expect(validateWyApiBaseUrl(input).error).toBe('too_long')
  })

  it('keeps shared contracts available through the desktop compatibility path', () => {
    const result: OperationResult<MediaItem[]> = { ok: true, value: [] }
    expect(validateWyApiBaseUrl).toBe(validateSharedWyApiBaseUrl)
    expect(normalizeWyApiBaseUrl).toBe(normalizeSharedWyApiBaseUrl)
    expect(result).toEqual({ ok: true, value: [] })
    expect(LIBRARY_LOCATIONS).toEqual(['all', 'local', 'cloud', 'webdav'])
  })
})
