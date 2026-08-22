export const MAX_WY_API_BASE_URL_LENGTH = 2048

export type WyApiBaseUrlError =
  | 'required'
  | 'too_long'
  | 'control_characters'
  | 'whitespace'
  | 'invalid_url'
  | 'unsupported_protocol'
  | 'insecure_http_not_allowed'
  | 'credentials_not_allowed'
  | 'query_not_allowed'
  | 'hash_not_allowed'

export interface WyApiBaseUrlValidationResult {
  valid: boolean
  value: string
  error?: WyApiBaseUrlError
}

const hasControlCharacters = (value: string): boolean => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true
  }
  return false
}

const isExactLoopbackAuthority = (value: string, protocol: string): boolean => {
  const authority = value.slice(protocol.length + 2).split('/', 1)[0]
  return /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(authority) || /^\[::1\](?::\d+)?$/.test(authority)
}

export const validateWyApiBaseUrl = (input: unknown): WyApiBaseUrlValidationResult => {
  if (typeof input !== 'string') return { valid: false, value: '', error: 'required' }
  if (input.length > MAX_WY_API_BASE_URL_LENGTH) {
    return { valid: false, value: '', error: 'too_long' }
  }
  if (hasControlCharacters(input)) {
    return { valid: false, value: '', error: 'control_characters' }
  }

  if (!input) return { valid: false, value: '', error: 'required' }
  if (/\s/u.test(input)) return { valid: false, value: '', error: 'whitespace' }

  const value = input
  if (value.includes('?')) return { valid: false, value: '', error: 'query_not_allowed' }
  if (value.includes('#')) return { valid: false, value: '', error: 'hash_not_allowed' }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { valid: false, value: '', error: 'invalid_url' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, value: '', error: 'unsupported_protocol' }
  }
  if (!parsed.hostname) return { valid: false, value: '', error: 'invalid_url' }
  if (parsed.username || parsed.password) {
    return { valid: false, value: '', error: 'credentials_not_allowed' }
  }
  if (parsed.protocol === 'http:' && !isExactLoopbackAuthority(value, parsed.protocol)) {
    return { valid: false, value: '', error: 'insecure_http_not_allowed' }
  }

  const pathname = parsed.pathname.replace(/\/+$/, '')
  const normalized = `${parsed.protocol}//${parsed.host}${pathname}`
  if (normalized.length > MAX_WY_API_BASE_URL_LENGTH) {
    return { valid: false, value: '', error: 'too_long' }
  }

  return { valid: true, value: normalized }
}

export const normalizeWyApiBaseUrl = (input: unknown): string => {
  const result = validateWyApiBaseUrl(input)
  return result.valid ? result.value : ''
}
