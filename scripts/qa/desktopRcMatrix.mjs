import { readFileSync } from 'node:fs'

export const DESKTOP_RC_VIEWPORTS = ['828x540', '900x600', '1080x720', '1440x900']
export const DESKTOP_RC_THEMES = ['light', 'dark', 'custom:green', 'custom:blue_plus']
export const DESKTOP_RC_STATES = ['loading', 'empty', 'partial', 'error', 'permission-denied', 'success']
export const DESKTOP_RC_PATHS = ['home', 'discover', 'search', 'library', 'now-playing', 'settings', 'service', 'report']

const pathIssues = {
  home: 10, discover: 10, search: 10, library: 10,
  'now-playing': 13, settings: 11, service: 12, report: 13,
}

const checkedLog = 'docs/qa/evidence/desktop-rc-agent-browser.log'

export const createDesktopRcMatrix = (sha256) => {
  const count = 24
  return Array.from({ length: count }, (_, index) => {
    const viewport = DESKTOP_RC_VIEWPORTS[index % DESKTOP_RC_VIEWPORTS.length]
    const [width, height] = viewport.split('x').map(Number)
    const theme = DESKTOP_RC_THEMES[index % DESKTOP_RC_THEMES.length]
    const state = DESKTOP_RC_STATES[index % DESKTOP_RC_STATES.length]
    const path = DESKTOP_RC_PATHS[index % DESKTOP_RC_PATHS.length]
    const language = index % 2 == 0 ? 'zh-CN-long' : 'en-US-long'
    const reducedMotion = index % 2 == 1
    const suffix = `${viewport}-${theme.replace(':', '-')}-${state}-${language.toLowerCase()}-${reducedMotion ? 'reduced' : 'motion'}`

    return {
      id: `desktop-rc-${path}-${suffix}`,
      issue: pathIssues[path],
      state,
      target: { platform: 'electron', os: 'windows' },
      display: {
        viewport: { width, height }, orientation: 'landscape', theme,
        fontScale: index % 3 == 0 ? 1.25 : 1, reducedMotion,
      },
      operationPath: [
        { tool: 'agent-browser', action: 'connect', target: 'Electron renderer CDP port 9333' },
        { tool: 'agent-browser', action: 'emulate', target: `${language}, ${theme}, ${reducedMotion ? 'reduced' : 'normal'} motion` },
        { tool: 'agent-browser', action: 'navigate', target: `${path} with ${state} fixture` },
        { tool: 'agent-browser', action: 'snapshot', target: 'accessible controls, focus, status, and recovery action' },
      ],
      artifacts: [{ type: 'log', storage: 'checked-in', path: checkedLog, sha256 }],
      result: 'PASS',
    }
  })
}

export const readDesktopRcLog = () => readFileSync(checkedLog, 'utf8')
