const COVER_PULSE_THEME_COLORS = Object.freeze({
  light: Object.freeze({
    '--color-canvas': '#EDF3F1',
    '--color-surface': '#FFFFFF',
    '--color-surface-raised': '#FFFFFF',
    '--color-text': '#171A1C',
    '--color-text-muted': '#68716D',
    '--color-border': '#D7DFDB',
    '--color-brand': '#FF3F5F',
    '--color-info': '#3E6BE0',
    '--color-danger': '#D94F4F',
    '--color-danger-strong': '#B93D3D',
    '--color-warning': '#8A5A00',
    '--color-focus': '#0B6BFF',
  }),
  dark: Object.freeze({
    '--color-canvas': '#111513',
    '--color-surface': '#181D1B',
    '--color-surface-raised': '#202623',
    '--color-text': '#F4F7F5',
    '--color-text-muted': '#A8B2AD',
    '--color-border': '#343C39',
    '--color-brand': '#FF6B80',
    '--color-info': '#7EA1FF',
    '--color-danger': '#FF7B72',
    '--color-danger-strong': '#E8665F',
    '--color-warning': '#F7B955',
    '--color-focus': '#8AB4FF',
  }),
})

const COMPATIBILITY_COLOR_ALIASES = Object.freeze({
  '--color-error': 'var(--color-danger)',
  '--color-error-dark': 'var(--color-danger-strong)',
  '--color-font-description': 'var(--color-text-muted)',
  '--color-label': 'var(--color-text-muted)',
  '--color-secondary-background': 'var(--color-surface-raised)',
  '--color-secondary-dark': 'var(--color-border)',
  '--color-secondary-font': 'var(--color-text-muted)',
  '--color-secondary-text': 'var(--color-text-muted)',
  '--color-song-item-background': 'var(--color-surface-raised)',
  '--white': '#FFFFFF',
})

exports.COVER_PULSE_THEME_COLORS = COVER_PULSE_THEME_COLORS
exports.COMPATIBILITY_COLOR_ALIASES = COMPATIBILITY_COLOR_ALIASES
exports.createSemanticThemeColors = (isDark) => ({
  ...COVER_PULSE_THEME_COLORS[isDark ? 'dark' : 'light'],
  ...COMPATIBILITY_COLOR_ALIASES,
})
