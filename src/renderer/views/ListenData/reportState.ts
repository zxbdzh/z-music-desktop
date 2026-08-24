export type ReportViewState =
  | 'service-missing'
  | 'login-missing'
  | 'auth-expired'
  | 'unreachable'
  | 'empty'
  | 'partial'
  | 'success'

const reportBlocks = [
  'listenTimeDistributionBlock',
  'topArtistBlock',
  'topSongBlock',
  'wallpaperBlock',
  'topStyleBlock',
  'topAgeBlock',
  'topLanguageBlock',
  'friendsListenWeekBlock',
]

export const isAuthenticationError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /(?:HTTP\s*)?(?:401|403)\b|unauth|login|cookie.*(?:expired|invalid)/i.test(message)
}

export const resolveReportViewState = ({
  serviceConfigured,
  loggedIn,
  error,
  data,
}: {
  serviceConfigured: boolean
  loggedIn: boolean
  error?: unknown
  data?: Record<string, unknown> | null
}): ReportViewState => {
  if (!serviceConfigured) return 'service-missing'
  if (!loggedIn) return 'login-missing'
  if (error) return isAuthenticationError(error) ? 'auth-expired' : 'unreachable'
  if (!data || Object.keys(data).length == 0) return 'empty'
  if (Array.isArray(data.yearItems)) return data.yearItems.length ? 'success' : 'empty'

  const available = reportBlocks.filter((key) => data[key] != null)
  if (available.length == 0) return 'empty'
  return available.length < reportBlocks.length ? 'partial' : 'success'
}
