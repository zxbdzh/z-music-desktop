import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import less from 'less'
import { describe, expect, it } from 'vitest'

const PROJECT_ROOT = process.cwd()
const THEME_ROOT = path.join(PROJECT_ROOT, 'src/common/theme')
const INDEX_STYLES_PATH = path.join(PROJECT_ROOT, 'src/renderer/assets/styles/index.less')
const VARIABLES_PATH = path.join(PROJECT_ROOT, 'src/renderer/assets/styles/variables.less')
const require = createRequire(path.join(PROJECT_ROOT, 'package.json'))

type ThemeColorMap = Record<string, string>
interface Theme {
  isDark: boolean
  config: {
    themeColors: ThemeColorMap
    extInfo: ThemeColorMap
  }
}

const {
  COMPATIBILITY_COLOR_ALIASES,
  COVER_PULSE_THEME_COLORS,
  createSemanticThemeColors,
} = require(path.join(THEME_ROOT, 'semanticTokens.js')) as {
  COMPATIBILITY_COLOR_ALIASES: Readonly<ThemeColorMap>
  COVER_PULSE_THEME_COLORS: Record<'light' | 'dark', Readonly<ThemeColorMap>>
  createSemanticThemeColors: (isDark?: boolean) => ThemeColorMap
}
const { createThemeColors } = require(path.join(THEME_ROOT, 'utils.js')) as {
  createThemeColors: (
    color: string,
    fontColor: string | undefined,
    isDark?: boolean,
    isDarkFont?: boolean
  ) => ThemeColorMap
}
const themes = require(path.join(THEME_ROOT, 'index.json')) as Theme[]

const FROZEN_LIGHT_COLORS = {
  '--color-canvas': '#EDF3F1',
  '--color-surface': '#FFFFFF',
  '--color-surface-raised': '#FFFFFF',
  '--color-text': '#171A1C',
  '--color-text-muted': '#68716D',
  '--color-border': '#D7DFDB',
  '--color-brand': '#FF3F5F',
  '--color-info': '#3E6BE0',
  '--color-danger': '#D94F4F',
  '--color-focus': '#0B6BFF',
}

const FROZEN_DARK_COLORS = {
  '--color-canvas': '#111513',
  '--color-surface': '#181D1B',
  '--color-surface-raised': '#202623',
  '--color-text': '#F4F7F5',
  '--color-text-muted': '#A8B2AD',
  '--color-border': '#343C39',
  '--color-brand': '#FF6B80',
  '--color-info': '#7EA1FF',
  '--color-danger': '#FF7B72',
  '--color-focus': '#8AB4FF',
}

const readSourceFiles = (directory: string, extensions: Set<string>): string[] => {
  const files: string[] = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...readSourceFiles(entryPath, extensions))
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(entryPath)
    }
  }

  return files
}

const stripComments = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('Cover Pulse semantic theme colors', () => {
  it('keeps the frozen light and dark values exact', () => {
    expect(COVER_PULSE_THEME_COLORS.light).toMatchObject(FROZEN_LIGHT_COLORS)
    expect(COVER_PULSE_THEME_COLORS.dark).toMatchObject(FROZEN_DARK_COLORS)
  })

  it('maps every existing theme and newly generated custom themes', () => {
    for (const theme of themes) {
      expect(theme.config.themeColors).toMatchObject(createSemanticThemeColors(theme.isDark))
    }

    expect(createThemeColors('rgb(77, 175, 124)', undefined, false)).toMatchObject(
      createSemanticThemeColors(false)
    )
    expect(createThemeColors('rgb(150, 150, 150)', undefined, true)).toMatchObject(
      createSemanticThemeColors(true)
    )
  })

  it('routes migration aliases through semantic roles', () => {
    const expectedAliases = {
      '--color-error': 'var(--color-danger)',
      '--color-font-description': 'var(--color-text-muted)',
      '--color-secondary-background': 'var(--color-surface-raised)',
      '--color-secondary-text': 'var(--color-text-muted)',
      '--color-song-item-background': 'var(--color-surface-raised)',
    }

    expect(COMPATIBILITY_COLOR_ALIASES).toMatchObject(expectedAliases)
    expect(createSemanticThemeColors(false)).toMatchObject(expectedAliases)
    expect(createSemanticThemeColors(true)).toMatchObject(expectedAliases)
  })

  it.each(['light', 'dark'] as const)('%s colors meet the contrast floor', (mode) => {
    const colors = COVER_PULSE_THEME_COLORS[mode]
    const backgrounds = [
      colors['--color-canvas'],
      colors['--color-surface'],
      colors['--color-surface-raised'],
    ]

    for (const background of backgrounds) {
      expect(contrastRatio(colors['--color-text'], background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors['--color-brand'], background)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(colors['--color-info'], background)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(colors['--color-danger'], background)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(colors['--color-focus'], background)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('design token publication', () => {
  it('compiles shell, spacing, radius, control and motion tokens to CSS', async () => {
    const source = fs.readFileSync(INDEX_STYLES_PATH, 'utf8')
    const { css } = await less.render(source, { filename: INDEX_STYLES_PATH })

    expect(css).toContain('--shell-sidebar-width: 184px;')
    expect(css).toContain('--shell-sidebar-compact-width: 64px;')
    expect(css).toContain('--shell-toolbar-height: 56px;')
    expect(css).toContain('--shell-player-height: 72px;')
    expect(css).toContain('--shell-player-cover-size: 56px;')
    expect(css).toContain('--space-1: 4px;')
    expect(css).toContain('--space-2: 8px;')
    expect(css).toContain('--space-3: 12px;')
    expect(css).toContain('--space-4: 16px;')
    expect(css).toContain('--space-5: 24px;')
    expect(css).toContain('--space-6: 32px;')
    expect(css).toContain('--control-height-small: 32px;')
    expect(css).toContain('--control-height-medium: 36px;')
    expect(css).toContain('--control-height-large: 40px;')
    expect(css).toContain('--icon-size-small: 16px;')
    expect(css).toContain('--icon-size-medium: 20px;')
    expect(css).toContain('--icon-size-large: 24px;')
    expect(css).toContain('--icon-hit-area: 40px;')
    expect(css).toContain('--radius-small: 4px;')
    expect(css).toContain('--radius-medium: 6px;')
    expect(css).toContain('--radius-large: 8px;')
    expect(css).toContain('--z-index-dropdown: 100;')
    expect(css).toContain('--z-index-overlay: 1000;')
    expect(css).toContain('--z-index-modal: 1100;')
    expect(css).toContain('--z-index-toast: 1200;')
    expect(css).toContain('--shadow-overlay: 0 8px 24px rgba(17, 21, 19, 0.12);')
    expect(css).toContain('--shadow-modal: 0 16px 40px rgba(17, 21, 19, 0.18);')
    expect(css).toContain('--motion-press: 120ms;')
    expect(css).toContain('--motion-enter: 200ms;')
    expect(css).toContain('--motion-exit: 140ms;')
    expect(css).toContain('--motion-state: 180ms;')
    expect(css).toContain('--ease-out: cubic-bezier(0.23, 1, 0.32, 1);')
    expect(css).toContain('--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);')
  })

  it('publishes every typography role from the parent design contract', async () => {
    const source = fs.readFileSync(INDEX_STYLES_PATH, 'utf8')
    const { css } = await less.render(source, { filename: INDEX_STYLES_PATH })

    expect(css).toContain('--font-size-page-title: 22px;')
    expect(css).toContain('--line-height-page-title: 30px;')
    expect(css).toContain('--font-weight-page-title: 650;')
    expect(css).toContain('--font-size-section-title: 16px;')
    expect(css).toContain('--line-height-section-title: 24px;')
    expect(css).toContain('--font-weight-section-title: 600;')
    expect(css).toContain('--font-size-body: 14px;')
    expect(css).toContain('--line-height-body: 21px;')
    expect(css).toContain('--font-size-compact-list: 13px;')
    expect(css).toContain('--line-height-compact-list: 20px;')
    expect(css).toContain('--font-size-label: 12px;')
    expect(css).toContain('--line-height-label: 16px;')
    expect(css).toContain('--font-size-playback-time: 13px;')
    expect(css).toContain('--line-height-playback-time: 18px;')
    expect(css).toContain('--font-variant-numeric-tabular: tabular-nums;')
  })

  it('keeps Less migration aliases on the new shell and motion scales', () => {
    const variables = fs.readFileSync(VARIABLES_PATH, 'utf8')

    expect(variables).toContain('@width-app-left: @width-sidebar-compact;')
    expect(variables).toContain('@transition-fast: @motion-press @ease-out;')
    expect(variables).toContain('@transition-normal: @motion-state @ease-out;')
    expect(variables).toContain('@transition-slow: @motion-enter @ease-out;')
  })

  it('provides a reduced-motion baseline', () => {
    const styles = fs.readFileSync(INDEX_STYLES_PATH, 'utf8')
    const reducedMotionStyles = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'))

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(reducedMotionStyles).toContain('animation: none !important;')
    expect(reducedMotionStyles).toContain('transition-duration: var(--motion-reduced) !important;')
    expect(reducedMotionStyles).toContain('--motion-distance-small: 0px;')
    expect(reducedMotionStyles).toContain(
      'transition-property: background-color, border-color, box-shadow, color, fill, opacity,'
    )
    expect(reducedMotionStyles).not.toMatch(/transition-property:[^;]*\btransform\b/)
    expect(reducedMotionStyles).not.toContain(':focus-visible')
    expect(reducedMotionStyles).toContain('transform: none !important;')
  })
})

describe('CSS variable guardrails', () => {
  it('does not reference undefined CSS variables in renderer source', () => {
    const sourceExtensions = new Set([
      '.css',
      '.html',
      '.js',
      '.jsx',
      '.less',
      '.ts',
      '.tsx',
      '.vue',
    ])
    const sourceFiles = [
      ...readSourceFiles(path.join(PROJECT_ROOT, 'src/renderer'), sourceExtensions),
      ...readSourceFiles(path.join(PROJECT_ROOT, 'src/renderer-lyric'), sourceExtensions),
    ]
    const references = new Set<string>()
    const definitions = new Set<string>()

    for (const file of sourceFiles) {
      const source = stripComments(fs.readFileSync(file, 'utf8'))
      for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g)) references.add(match[1])
      for (const match of source.matchAll(/['"]?(--[\w-]+)['"]?\s*:/g)) definitions.add(match[1])
      for (const match of source.matchAll(/\[['"](--[\w-]+)['"]\]\s*=/g)) definitions.add(match[1])
      for (const match of source.matchAll(/setProperty\(\s*['"](--[\w-]+)['"]/g))
        definitions.add(match[1])
    }

    for (const theme of themes) {
      Object.keys(theme.config.themeColors).forEach((token) => definitions.add(token))
      Object.keys(theme.config.extInfo).forEach((token) => definitions.add(token))
    }

    const externalVariables = new Set(['--pcr-color'])
    const undefinedVariables = [...references]
      .filter((token) => !definitions.has(token) && !externalVariables.has(token))
      .sort()

    expect(undefinedVariables).toEqual([])
  })

  it('keeps frozen theme hex values out of page components', () => {
    const rendererRoot = path.join(PROJECT_ROOT, 'src/renderer')
    const componentFiles = readSourceFiles(rendererRoot, new Set(['.vue']))
    const frozenHexValues = new Set(
      [...Object.values(FROZEN_LIGHT_COLORS), ...Object.values(FROZEN_DARK_COLORS)].map((color) =>
        color.toLowerCase()
      )
    )
    const violations: string[] = []

    for (const file of componentFiles) {
      const source = stripComments(fs.readFileSync(file, 'utf8')).toLowerCase()
      for (const color of frozenHexValues) {
        if (source.includes(color)) violations.push(`${path.relative(PROJECT_ROOT, file)}: ${color}`)
      }
    }

    expect(violations).toEqual([])
  })
})
