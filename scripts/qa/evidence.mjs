import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { isIP } from 'node:net'
import { isAbsolute, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const evidenceStates = Object.freeze([
  'loading',
  'empty',
  'partial',
  'error',
  'permission-denied',
  'success'
])

export const androidAcceptanceApiLevels = Object.freeze([24, 35, 36])

const sensitiveKey = /^(?:authorization|proxy-authorization|cookie|set-cookie|password|passphrase|token|access[_-]?token|refresh[_-]?token|session|secret|api[_-]?key|client[_-]?secret|credential(?:s)?)$/i
const sensitiveTextPatterns = [
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\bafxp_[A-Za-z0-9]+\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
]
const sensitiveAssignmentPattern = /\b(?:authorization|proxy-authorization|cookie|set-cookie|password|passphrase|token|access[_-]?token|refresh[_-]?token|session|secret|api[_-]?key|client[_-]?secret|credential(?:s)?)\b["']?\s*[:=]\s*["']?[^\s,;}\]]+/gi
const urlPattern = /\b(?:https?|file):\/\/[^\s"'<>]+/gi
const artifactPathPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

export class EvidenceValidationError extends Error {
  constructor (errors) {
    super(`Evidence validation failed:\n- ${errors.join('\n- ')}`)
    this.name = 'EvidenceValidationError'
    this.errors = errors
  }
}

function isPlainObject (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function ipv4Parts (address) {
  if (isIP(address) !== 4) return null
  return address.split('.').map(Number)
}

function isPublicIpv4 (address) {
  const parts = ipv4Parts(address)
  if (!parts) return false
  const [a, b, c] = parts
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && ((b === 0 && [0, 2, 99].includes(c)) || b === 168)) return false
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false
  if (a === 203 && b === 0 && c === 113) return false
  return true
}

function ipv6Words (address) {
  if (isIP(address) !== 6) return null
  const [left = '', right = ''] = address.split('::')
  const leftWords = left === '' ? [] : left.split(':')
  const rightWords = right === '' ? [] : right.split(':')
  const omitted = 8 - leftWords.length - rightWords.length
  if (omitted < 0 || (!address.includes('::') && omitted !== 0)) return null
  return [...leftWords, ...Array(omitted).fill('0'), ...rightWords].map(word => Number.parseInt(word, 16))
}

function isPublicIpv6 (address) {
  const words = ipv6Words(address)
  if (!words) return false
  const [first, second] = words
  if (words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff) {
    return false
  }
  if ((first & 0xe000) !== 0x2000) return false
  if (first === 0x2001 && (second & 0xfe00) === 0) return false
  if (first === 0x2001 && second === 0x0db8) return false
  if (first === 0x2002) return false
  if (first === 0x3fff && (second & 0xf000) === 0) return false
  return true
}

function isPublicHostname (hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) return false
  const version = isIP(host)
  if (version === 4) return isPublicIpv4(host)
  if (version === 6) return isPublicIpv6(host)
  return true
}

function publicUrl (value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false
  return isPublicHostname(url.hostname)
}

export function redactText (value) {
  let result = String(value)
  result = result.replace(urlPattern, match => {
    if (match.toLowerCase().startsWith('file://')) return '<redacted-file-uri>'
    try {
      const url = new URL(match)
      if (url.username || url.password || !publicUrl(`${url.origin}${url.pathname}`)) {
        return '<redacted-url>'
      }
      return `${url.origin}${url.pathname}`
    } catch {
      return '<redacted-url>'
    }
  })
  result = result
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+\\[^\s"']+/gi, '<redacted-path>')
    .replace(/\/(?:home|Users)\/[^/\s]+\/[^\s"']+/g, '<redacted-path>')
  for (const pattern of sensitiveTextPatterns) result = result.replace(pattern, '<redacted>')
  result = result.replace(sensitiveAssignmentPattern, match => (
    /<redacted(?:-[^>]+)?>/i.test(match) ? match : '<redacted>'
  ))
  return result
}

export function redactEvidence (value) {
  if (Array.isArray(value)) return value.map(redactEvidence)
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? '<redacted>' : redactEvidence(item)
    ]))
  }
  return typeof value === 'string' ? redactText(value) : value
}

function collectSensitiveData (value, location = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectSensitiveData(item, `${location}[${index}]`, findings))
    return findings
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      const child = `${location}.${key}`
      if (sensitiveKey.test(key)) findings.push(`${child} uses a forbidden sensitive field name`)
      collectSensitiveData(item, child, findings)
    }
    return findings
  }
  if (typeof value !== 'string') return findings

  if (/\bfile:\/\//i.test(value)) findings.push(`${location} contains a private file URI`)
  for (const pattern of sensitiveTextPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(value)) findings.push(`${location} contains secret-like text`)
  }
  sensitiveAssignmentPattern.lastIndex = 0
  if ([...value.matchAll(sensitiveAssignmentPattern)].some(match => !/<redacted(?:-[^>]+)?>/i.test(match[0]))) {
    findings.push(`${location} contains secret-like text`)
  }
  for (const match of value.matchAll(urlPattern)) {
    if (!publicUrl(match[0])) findings.push(`${location} contains an unsafe URL`)
  }
  if (/[A-Za-z]:\\Users\\[^\\\s]+\\/i.test(value) || /\/(?:home|Users)\/[^/\s]+\//.test(value)) {
    findings.push(`${location} contains a private filesystem path`)
  }
  return findings
}

function insideRoot (root, candidate) {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

function resolveRepoPath (root, path, errors, location) {
  if (typeof path !== 'string' || path === '' || path.includes('\\')) {
    errors.push(`${location} must be a non-empty repository-relative POSIX path`)
    return null
  }
  if (path.split('/').some(segment => segment === '.' || segment === '..')) {
    errors.push(`${location} must not contain dot path segments`)
    return null
  }
  const candidate = resolve(root, path)
  if (!insideRoot(root, candidate)) {
    errors.push(`${location} escapes the repository root`)
    return null
  }
  return candidate
}

function exactKeys (value, allowed, required, location, errors) {
  if (!isPlainObject(value)) {
    errors.push(`${location} must be an object`)
    return false
  }
  for (const key of required) if (!(key in value)) errors.push(`${location}.${key} is required`)
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${location}.${key} is not allowed`)
  return true
}

function validateDisplay (display, location, errors) {
  if (!exactKeys(display, ['viewport', 'orientation', 'theme', 'fontScale', 'reducedMotion'], ['viewport', 'orientation', 'theme', 'fontScale', 'reducedMotion'], location, errors)) return
  const validViewportShape = exactKeys(display.viewport, ['width', 'height'], ['width', 'height'], `${location}.viewport`, errors)
  if (!validViewportShape || !Number.isInteger(display.viewport.width) || display.viewport.width < 1 || !Number.isInteger(display.viewport.height) || display.viewport.height < 1) {
    errors.push(`${location}.viewport must contain positive integer width and height`)
  }
  if (!['portrait', 'landscape'].includes(display.orientation)) errors.push(`${location}.orientation is unknown`)
  if (!['light', 'dark', 'system'].includes(display.theme)) errors.push(`${location}.theme is unknown`)
  if (typeof display.fontScale !== 'number' || display.fontScale <= 0) errors.push(`${location}.fontScale must be positive`)
  if (typeof display.reducedMotion !== 'boolean') errors.push(`${location}.reducedMotion must be boolean`)
}

function validateTarget (target, location, errors) {
  if (!isPlainObject(target)) {
    errors.push(`${location} must be an object`)
    return
  }
  if (target.platform === 'electron') {
    exactKeys(target, ['platform', 'os'], ['platform', 'os'], location, errors)
    if (!['windows', 'linux', 'macos'].includes(target.os)) errors.push(`${location}.os is unknown`)
  } else if (target.platform === 'android') {
    exactKeys(target, ['platform', 'deviceType', 'device', 'apiLevel'], ['platform', 'deviceType', 'device', 'apiLevel'], location, errors)
    if (!['emulator', 'physical'].includes(target.deviceType)) errors.push(`${location}.deviceType is unknown`)
    if (typeof target.device !== 'string' || target.device.trim() === '') errors.push(`${location}.device is required`)
    if (!androidAcceptanceApiLevels.includes(target.apiLevel)) {
      errors.push(`${location}.apiLevel must be one of ${androidAcceptanceApiLevels.join(', ')}`)
    }
  } else {
    errors.push(`${location}.platform is unknown`)
  }
}

function validateOperationPath (actions, platform, location, errors) {
  if (!Array.isArray(actions) || actions.length === 0) {
    errors.push(`${location} must contain at least one exact action`)
    return
  }
  actions.forEach((action, index) => {
    const actionLocation = `${location}[${index}]`
    if (!exactKeys(action, ['tool', 'action', 'target'], ['tool', 'action', 'target'], actionLocation, errors)) return
    for (const key of ['tool', 'action', 'target']) {
      if (typeof action[key] !== 'string' || action[key].trim() === '') errors.push(`${actionLocation}.${key} is required`)
    }
  })
  if (platform === 'electron' && actions.some(action => action?.tool !== 'orca-computer-use')) {
    errors.push(`${location} must use orca-computer-use for every Electron action`)
  }
}

function validateArtifacts (artifacts, root, location, errors) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    errors.push(`${location} must contain at least one artifact`)
    return
  }
  artifacts.forEach((artifact, index) => {
    const artifactLocation = `${location}[${index}]`
    if (!exactKeys(artifact, ['type', 'storage', 'path', 'sha256', 'artifactName'], ['type', 'storage', 'path', 'sha256'], artifactLocation, errors)) return
    if (!['screenshot', 'log'].includes(artifact.type)) errors.push(`${artifactLocation}.type is unknown`)
    if (!['checked-in', 'ci-artifact'].includes(artifact.storage)) errors.push(`${artifactLocation}.storage is unknown`)
    const validDigest = /^[0-9a-f]{64}$/.test(artifact.sha256 || '')
    if (!validDigest) errors.push(`${artifactLocation}.sha256 must be lowercase SHA-256`)
    if (typeof artifact.path !== 'string' || !artifactPathPattern.test(artifact.path)) {
      errors.push(`${artifactLocation}.path does not match the manifest schema`)
    }
    const artifactPath = resolveRepoPath(root, artifact.path, errors, `${artifactLocation}.path`)
    if (artifact.storage === 'checked-in') {
      if (!artifact.path?.startsWith('docs/qa/evidence/')) errors.push(`${artifactLocation}.path must be below docs/qa/evidence/`)
      if (artifactPath && !existsSync(artifactPath)) {
        errors.push(`${artifactLocation}.path does not exist`)
      } else if (artifactPath) {
        const contents = readFileSync(artifactPath)
        if (validDigest && sha256(contents, artifact.type === 'log') !== artifact.sha256) {
          errors.push(`${artifactLocation}.sha256 does not match the checked-in artifact`)
        }
        if (artifact.type === 'log') {
          errors.push(...collectSensitiveData(contents.toString('utf8'), `${artifactLocation}.checked-in log`))
        }
      }
      if ('artifactName' in artifact) errors.push(`${artifactLocation}.artifactName is only valid for CI artifacts`)
    }
    if (artifact.storage === 'ci-artifact' && !/^[a-z0-9][a-z0-9._-]{2,127}$/.test(artifact.artifactName || '')) {
      errors.push(`${artifactLocation}.artifactName must be a stable lowercase name`)
    }
  })
}

function isRfc3339DateTime (value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$/.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return false
  if (Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 60) return false
  if (offsetHourText && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) return false
  return true
}

export function validateEvidenceManifest (manifest, options = {}) {
  const root = resolve(options.root || process.cwd())
  const errors = collectSensitiveData(manifest)
  if (!exactKeys(manifest, ['schemaVersion', 'kind', 'commit', 'generatedAt', 'fixtureCatalog', 'matrix'], ['schemaVersion', 'kind', 'commit', 'generatedAt', 'fixtureCatalog', 'matrix'], '$', errors)) {
    throw new EvidenceValidationError(errors)
  }
  if (manifest.schemaVersion !== '1.0') errors.push('$.schemaVersion must be 1.0')
  if (manifest.kind !== 'executable-product-evidence') errors.push('$.kind must separate product evidence from design mockups')
  if (!/^[0-9a-f]{40}$/.test(manifest.commit || '')) errors.push('$.commit must be a full lowercase Git commit hash')
  if (options.expectedCommit && manifest.commit !== options.expectedCommit) errors.push('$.commit is stale for the expected checkout')
  if (!isRfc3339DateTime(manifest.generatedAt)) errors.push('$.generatedAt must be an RFC3339 date-time')
  if (!exactKeys(manifest.fixtureCatalog, ['version', 'path'], ['version', 'path'], '$.fixtureCatalog', errors)) {
    // The shape error above is sufficient.
  } else {
    if (manifest.fixtureCatalog.version !== '1.0') errors.push('$.fixtureCatalog.version must be 1.0')
    if (manifest.fixtureCatalog.path !== 'docs/qa/fixtures/catalog.v1.json') errors.push('$.fixtureCatalog.path must reference the canonical catalog')
    const catalogPath = resolveRepoPath(root, manifest.fixtureCatalog.path, errors, '$.fixtureCatalog.path')
    if (catalogPath && !existsSync(catalogPath)) errors.push('$.fixtureCatalog.path does not exist')
  }
  if (!Array.isArray(manifest.matrix) || manifest.matrix.length === 0) {
    errors.push('$.matrix must contain at least one explicit matrix row')
  } else {
    const ids = new Set()
    manifest.matrix.forEach((row, index) => {
      const location = `$.matrix[${index}]`
      if (!exactKeys(row, ['id', 'issue', 'state', 'target', 'display', 'operationPath', 'artifacts', 'result'], ['id', 'issue', 'state', 'target', 'display', 'operationPath', 'artifacts', 'result'], location, errors)) return
      if (!/^[a-z0-9][a-z0-9._-]*$/.test(row.id || '')) errors.push(`${location}.id is invalid`)
      if (ids.has(row.id)) errors.push(`${location}.id is duplicated`)
      ids.add(row.id)
      if (!Number.isInteger(row.issue) || row.issue < 1) errors.push(`${location}.issue must be a positive integer`)
      if (!evidenceStates.includes(row.state)) errors.push(`${location}.state is unknown`)
      validateTarget(row.target, `${location}.target`, errors)
      validateDisplay(row.display, `${location}.display`, errors)
      validateOperationPath(row.operationPath, row.target?.platform, `${location}.operationPath`, errors)
      validateArtifacts(row.artifacts, root, `${location}.artifacts`, errors)
      if (!['PASS', 'FAIL'].includes(row.result)) errors.push(`${location}.result must be PASS or FAIL`)
    })
  }
  if (errors.length > 0) throw new EvidenceValidationError(errors)
  return { rows: manifest.matrix.length, commit: manifest.commit }
}

function sha256 (contents, normalizeText = false) {
  const input = normalizeText ? contents.toString('utf8').replace(/\r\n/g, '\n') : contents
  return createHash('sha256').update(input).digest('hex')
}

export function validateFixtureCatalog (catalog, options = {}) {
  const root = resolve(options.root || process.cwd())
  const errors = collectSensitiveData(catalog)
  if (!exactKeys(catalog, ['schemaVersion', 'kind', 'requiredStates', 'fixtures'], ['schemaVersion', 'kind', 'requiredStates', 'fixtures'], '$', errors)) {
    throw new EvidenceValidationError(errors)
  }
  if (catalog.schemaVersion !== '1.0') errors.push('$.schemaVersion must be 1.0')
  if (catalog.kind !== 'deterministic-qa-fixture-catalog') errors.push('$.kind is invalid')
  if (JSON.stringify(catalog.requiredStates) !== JSON.stringify(evidenceStates)) errors.push('$.requiredStates must list every canonical state in order')
  if (!Array.isArray(catalog.fixtures)) {
    errors.push('$.fixtures must be an array')
  } else {
    const seen = new Set()
    catalog.fixtures.forEach((fixture, index) => {
      const location = `$.fixtures[${index}]`
      if (!exactKeys(fixture, ['state', 'path', 'sha256'], ['state', 'path', 'sha256'], location, errors)) return
      if (!evidenceStates.includes(fixture.state)) errors.push(`${location}.state is unknown`)
      if (seen.has(fixture.state)) errors.push(`${location}.state is duplicated`)
      seen.add(fixture.state)
      if (!/^[0-9a-f]{64}$/.test(fixture.sha256 || '')) errors.push(`${location}.sha256 must be lowercase SHA-256`)
      if (!fixture.path?.startsWith('docs/qa/fixtures/states/')) errors.push(`${location}.path must be below docs/qa/fixtures/states/`)
      const fixturePath = resolveRepoPath(root, fixture.path, errors, `${location}.path`)
      if (!fixturePath || !existsSync(fixturePath)) {
        if (fixturePath) errors.push(`${location}.path does not exist`)
        return
      }
      const contents = readFileSync(fixturePath)
      if (sha256(contents, true) !== fixture.sha256) errors.push(`${location}.sha256 does not match the fixture file`)
      try {
        const data = JSON.parse(contents)
        if (data.state !== fixture.state) errors.push(`${location}.state does not match the fixture payload`)
        errors.push(...collectSensitiveData(data, `${location}.payload`))
      } catch {
        errors.push(`${location}.path is not valid JSON`)
      }
    })
    for (const state of evidenceStates) if (!seen.has(state)) errors.push(`$.fixtures is missing state ${state}`)
    if (catalog.fixtures.length !== evidenceStates.length) errors.push('$.fixtures must contain exactly one fixture per canonical state')
  }
  if (errors.length > 0) throw new EvidenceValidationError(errors)
  return { fixtures: catalog.fixtures.length, states: [...evidenceStates] }
}

function readJson (path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'))
}

function usage () {
  return 'Usage: node scripts/qa/evidence.mjs <validate MANIFEST [--commit HASH] | fixtures CATALOG | redact FILE>'
}

export function resolveCurrentCommit (root = process.cwd(), run = execFileSync) {
  try {
    const commit = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd: resolve(root), encoding: 'utf8' }).trim()
    if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('Git returned an invalid commit hash')
    return commit
  } catch (error) {
    throw new Error(`Cannot resolve current Git HEAD: ${error.message}`)
  }
}

async function main (args) {
  const [command, input, ...rest] = args
  if (!command || !input) throw new Error(usage())
  if (command === 'validate') {
    const commitIndex = rest.indexOf('--commit')
    const expectedCommit = resolveCurrentCommit()
    if (commitIndex >= 0 && rest[commitIndex + 1] !== expectedCommit) {
      throw new Error('--commit must equal the current Git HEAD')
    }
    const result = validateEvidenceManifest(readJson(input), { expectedCommit })
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return
  }
  if (command === 'fixtures') {
    const result = validateFixtureCatalog(readJson(input))
    process.stdout.write(`${JSON.stringify(result)}\n`)
    return
  }
  if (command === 'redact') {
    const contents = readFileSync(resolve(input), 'utf8')
    let output
    try {
      output = JSON.stringify(redactEvidence(JSON.parse(contents)), null, 2)
    } catch {
      output = redactText(contents)
    }
    process.stdout.write(`${output}\n`)
    return
  }
  throw new Error(usage())
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  })
}
