import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { ESLint } from 'eslint'

const require = createRequire(import.meta.url)

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
const catalogPath = path.join(root, 'scripts/lint/generated-code.v1.json')
const reportPath = path.join(root, '.artifacts/lint/report.json')
const safePathPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
export const lintBaseIgnorePatterns = Object.freeze([
  'node_modules',
  'dist',
  'build',
  'build-*',
  'publish',
  'output',
  '.artifacts',
  'src/**/*.d.ts',
])
export const generatedArtifactPaths = Object.freeze([
  'src/common/utils/effects/snow.min.js',
  'src/renderer/utils/musicSdk/kg/vendors/infSign.min.js',
  'src/static/audio_match/afp.js',
  'src/static/audio_match/afp.wasm.js',
  'src/renderer/utils/audioMatch/afp.js',
  'src/renderer/utils/audioMatch/afp.wasm',
  'src/renderer/utils/audioMatch/afp.wasm.js',
])

const sensitiveAssignmentPattern = /\b(?:access[_-]?token|api[_-]?key|client[_-]?secret|password)\b\s*[:=]\s*(['"`])([^'"`\r\n]{8,})\1/gi
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i
const platformTokenPatterns = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\b(?:glpat|gldt|gitcode)_[A-Za-z0-9_-]{16,}\b/i,
]
const authorizationPattern = /\b(?:Bearer|Basic)\s+([A-Za-z0-9._~+/-]{12,}={0,2})\b/gi

function containsCredentialLikeText(text, allowFixtureValues = false) {
  if (privateKeyPattern.test(text) || platformTokenPatterns.some((pattern) => pattern.test(text))) return true
  authorizationPattern.lastIndex = 0
  for (const match of text.matchAll(authorizationPattern)) {
    if (allowFixtureValues && /^(?:fixture|test)-/.test(match[1])) continue
    return true
  }
  sensitiveAssignmentPattern.lastIndex = 0
  for (const match of text.matchAll(sensitiveAssignmentPattern)) {
    if (allowFixtureValues && /^(?:fixture|test)-/.test(match[2])) continue
    return true
  }
  return false
}
const unsafeUrlPattern = /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?(?:[/?#'"`\s]|$)/i

const sha256 = (contents, normalizeText = false) => createHash('sha256')
  .update(normalizeText ? contents.toString('utf8').replace(/\r\n/g, '\n') : contents)
  .digest('hex')

export async function validateGeneratedCatalog(catalog, options = {}) {
  const repositoryRoot = path.resolve(options.root ?? root)
  const ignorePatterns = options.ignorePatterns ?? []
  const expectedPaths = options.expectedArtifactPaths ?? generatedArtifactPaths
  const baseIgnorePatterns = options.baseIgnorePatterns ?? lintBaseIgnorePatterns
  const errors = []

  if (catalog?.schemaVersion !== '1.0') errors.push('catalog.schemaVersion must be 1.0')
  if (catalog?.kind !== 'generated-code-lint-boundary') errors.push('catalog.kind is invalid')
  if (!Array.isArray(catalog?.artifacts) || catalog.artifacts.length === 0) {
    errors.push('catalog.artifacts must not be empty')
    return errors
  }

  const seen = new Set()
  const expectedIgnores = []
  for (const [index, artifact] of catalog.artifacts.entries()) {
    const location = `catalog.artifacts[${index}]`
    if (typeof artifact.path !== 'string' || !safePathPattern.test(artifact.path) || artifact.path.includes('..')) {
      errors.push(`${location}.path must be a safe repository-relative POSIX path`)
      continue
    }
    if (seen.has(artifact.path)) errors.push(`${location}.path is duplicated`)
    seen.add(artifact.path)
    if (!/^[0-9a-f]{64}$/.test(artifact.sha256 ?? '')) errors.push(`${location}.sha256 is invalid`)
    if (typeof artifact.lintExcluded !== 'boolean' || typeof artifact.textScan !== 'boolean') {
      errors.push(`${location} must declare lintExcluded and textScan`)
      continue
    }
    if (!['lf-text', 'binary'].includes(artifact.hashMode)) {
      errors.push(`${location}.hashMode must be lf-text or binary`)
    }
    if (artifact.textScan && artifact.hashMode !== 'lf-text') {
      errors.push(`${location}.hashMode must be lf-text when textScan is enabled`)
    }
    if (!artifact.source?.description || !artifact.source?.reference) {
      errors.push(`${location}.source must document provenance`)
    }
    if (artifact.path.endsWith('.js') && !artifact.textScan) {
      errors.push(`${location}.textScan must be true for generated JavaScript`)
    }
    if (artifact.lintExcluded) expectedIgnores.push(artifact.path)

    const absolutePath = path.resolve(repositoryRoot, artifact.path)
    if (!absolutePath.startsWith(`${repositoryRoot}${path.sep}`)) {
      errors.push(`${location}.path escapes the repository root`)
      continue
    }
    try {
      const stats = await lstat(absolutePath)
      if (!stats.isFile() || stats.isSymbolicLink()) {
        errors.push(`${location}.path must be a regular non-symlink file`)
        continue
      }
      const contents = await readFile(absolutePath)
      if (sha256(contents, artifact.hashMode === 'lf-text') !== artifact.sha256) errors.push(`${location}.sha256 does not match ${artifact.path}`)
      if (artifact.textScan) {
        const text = contents.toString('utf8')
        if (containsCredentialLikeText(text)) errors.push(`${location}.path contains credential-like text`)
        if (unsafeUrlPattern.test(text)) errors.push(`${location}.path contains a development/private URL`)
      }
    } catch (error) {
      errors.push(`${location}.path cannot be read: ${error.message}`)
    }
  }

  const actualPaths = [...seen].sort()
  if (JSON.stringify(actualPaths) !== JSON.stringify([...expectedPaths].sort())) {
    errors.push('catalog artifact paths must exactly match the approved generated artifact set')
  }

  const expectedIgnorePatterns = [...baseIgnorePatterns, ...expectedIgnores].sort()
  if (JSON.stringify([...ignorePatterns].sort()) !== JSON.stringify(expectedIgnorePatterns)) {
    errors.push('ESLint ignore patterns must exactly match the fixed allowlist and catalog exclusions')
  }
  return errors
}

export async function scanFirstPartyCredentials(results, options = {}) {
  const repositoryRoot = path.resolve(options.root ?? root)
  const findings = []
  for (const result of results) {
    if (result.ignored) continue
    const relativePath = path.relative(repositoryRoot, result.filePath).split(path.sep).join('/')
    if (!relativePath.startsWith('src/')) continue
    const text = await readFile(result.filePath, 'utf8')
    const isTestFile = /(?:^|\/)\w[^/]*\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relativePath)
    if (containsCredentialLikeText(text, isTestFile)) findings.push(relativePath)
  }
  return findings.sort()
}

export function summarizeResults(results) {
  const messages = results.flatMap((result) => result.messages.map((message) => ({
    file: path.relative(root, result.filePath).split(path.sep).join('/'),
    line: message.line,
    column: message.column,
    ruleId: message.ruleId,
    severity: message.severity,
    message: message.message,
  })))
  const byRule = Object.fromEntries(Object.entries(messages.reduce((counts, message) => {
    const rule = message.ruleId ?? 'fatal'
    counts[rule] = (counts[rule] ?? 0) + 1
    return counts
  }, {})).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])))
  return {
    files: results.length,
    errors: messages.filter((message) => message.severity === 2).length,
    warnings: messages.filter((message) => message.severity === 1).length,
    byRule,
    messages,
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
  const config = require('../../.eslintrc.cjs')
  const catalogErrors = await validateGeneratedCatalog(catalog, { ignorePatterns: config.ignorePatterns })
  const eslint = new ESLint({ cwd: root, errorOnUnmatchedPattern: true })
  const results = await eslint.lintFiles(['src/**/*.{ts,js,vue}'])
  const summary = summarizeResults(results)
  const credentialFindings = await scanFirstPartyCredentials(results)
  const report = {
    schemaVersion: '1.0',
    generatedCode: {
      artifacts: catalog.artifacts.map(({ path: artifactPath, sha256: digest, hashMode, lintExcluded, source }) => ({
        path: artifactPath,
        sha256: digest,
        hashMode,
        lintExcluded,
        source,
      })),
      errors: catalogErrors,
    },
    firstParty: {
      ...summary,
      credentialFindings,
    },
  }

  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({
    files: summary.files,
    errors: summary.errors,
    warnings: summary.warnings,
    byRule: summary.byRule,
    generatedArtifacts: catalog.artifacts.length,
    generatedCodeErrors: catalogErrors.length,
    credentialFindings: credentialFindings.length,
    report: path.relative(root, reportPath).split(path.sep).join('/'),
  }, null, 2)}\n`)

  if (catalogErrors.length || summary.errors || summary.warnings || credentialFindings.length) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`)
    process.exitCode = 1
  })
}
