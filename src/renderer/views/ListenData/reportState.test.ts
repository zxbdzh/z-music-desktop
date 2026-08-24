import { describe, expect, it } from 'vitest'
import { isAuthenticationError, resolveReportViewState } from './reportState'

const base = { serviceConfigured: true, loggedIn: true }
const allBlocks = {
  listenTimeDistributionBlock: {}, topArtistBlock: {}, topSongBlock: {}, wallpaperBlock: {},
  topStyleBlock: {}, topAgeBlock: {}, topLanguageBlock: {}, friendsListenWeekBlock: {},
}

describe('listening report view state', () => {
  it('keeps missing service, missing login, expired login, and unreachable service distinct', () => {
    expect(resolveReportViewState({ ...base, serviceConfigured: false })).toBe('service-missing')
    expect(resolveReportViewState({ ...base, loggedIn: false })).toBe('login-missing')
    expect(resolveReportViewState({ ...base, error: new Error('HTTP 401: request failed') })).toBe('auth-expired')
    expect(resolveReportViewState({ ...base, error: new Error('HTTP 503: request failed') })).toBe('unreachable')
    expect(isAuthenticationError(new Error('cookie expired'))).toBe(true)
  })

  it('distinguishes empty, partial, and complete report payloads', () => {
    expect(resolveReportViewState({ ...base, data: null })).toBe('empty')
    expect(resolveReportViewState({ ...base, data: { topSongBlock: {} } })).toBe('partial')
    expect(resolveReportViewState({ ...base, data: allBlocks })).toBe('success')
    expect(resolveReportViewState({ ...base, data: { yearItems: [] } })).toBe('empty')
    expect(resolveReportViewState({ ...base, data: { yearItems: [{ year: 2026 }] } })).toBe('success')
  })
})
