import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  redactEvidence,
  redactText,
  validateEvidenceManifest,
  validateFixtureCatalog
} from './evidence.mjs'

const commit = 'a'.repeat(40)
const digest = 'b'.repeat(64)
const checkedInArtifact = 'fixture screenshot'
const checkedInDigest = createHash('sha256').update(checkedInArtifact).digest('hex')
const scriptPath = resolve(fileURLToPath(new URL('./evidence.mjs', import.meta.url)))
const roots = []

test.after(() => {
  roots.forEach(root => rmSync(root, { recursive: true, force: true }))
})

function fixtureRoot () {
  const root = mkdtempSync(join(tmpdir(), 'z-music-desktop-evidence-'))
  roots.push(root)
  mkdirSync(join(root, 'docs', 'qa', 'evidence'), { recursive: true })
  mkdirSync(join(root, 'docs', 'qa', 'fixtures'), { recursive: true })
  writeFileSync(join(root, 'docs', 'qa', 'evidence', 'screen.png'), checkedInArtifact)
  writeFileSync(join(root, 'docs', 'qa', 'fixtures', 'catalog.v1.json'), '{}')
  return root
}

function display () {
  return {
    viewport: { width: 1280, height: 720 },
    orientation: 'landscape',
    theme: 'dark',
    fontScale: 1,
    reducedMotion: false
  }
}

function artifact () {
  return {
    type: 'screenshot',
    storage: 'checked-in',
    path: 'docs/qa/evidence/screen.png',
    sha256: checkedInDigest
  }
}

function manifest () {
  return {
    schemaVersion: '1.0',
    kind: 'executable-product-evidence',
    commit,
    generatedAt: '2026-08-17T00:00:00.000Z',
    fixtureCatalog: { version: '1.0', path: 'docs/qa/fixtures/catalog.v1.json' },
    matrix: [
      {
        id: 'electron-loading-dark',
        issue: 7,
        state: 'loading',
        target: { platform: 'electron', os: 'windows' },
        display: display(),
        operationPath: [
          { tool: 'orca-computer-use', action: 'click', target: 'Library navigation item' }
        ],
        artifacts: [artifact()],
        result: 'PASS'
      },
      {
        id: 'android-success-light',
        issue: 27,
        state: 'success',
        target: { platform: 'android', deviceType: 'emulator', device: 'Pixel 8', apiLevel: 35 },
        display: { ...display(), orientation: 'portrait', theme: 'light' },
        operationPath: [
          { tool: 'adb', action: 'tap', target: 'Library navigation item' }
        ],
        artifacts: [{
          type: 'log',
          storage: 'ci-artifact',
          path: 'android/api-35/library.log',
          artifactName: 'acceptance-android-api35',
          sha256: digest
        }],
        result: 'PASS'
      }
    ]
  }
}

test('accepts complete Electron and Android matrix rows', () => {
  const root = fixtureRoot()
  assert.deepEqual(validateEvidenceManifest(manifest(), { root, expectedCommit: commit }), {
    rows: 2,
    commit
  })
})

test('accepts only the frozen Android API levels while preserving Electron rows', () => {
  const root = fixtureRoot()
  for (const apiLevel of [24, 35, 36]) {
    const value = manifest()
    value.matrix[1].target.apiLevel = apiLevel
    assert.equal(validateEvidenceManifest(value, { root }).rows, 2)
  }

  for (const apiLevel of [23, 34, 37]) {
    const value = manifest()
    value.matrix[1].target.apiLevel = apiLevel
    assert.throws(
      () => validateEvidenceManifest(value, { root }),
      /apiLevel must be one of 24, 35, 36/
    )
  }
})

test('rejects missing files, unknown states, and stale commits', () => {
  const root = fixtureRoot()
  const value = manifest()
  value.matrix[0].artifacts[0].path = 'docs/qa/evidence/missing.png'
  value.matrix[0].state = 'cached'
  assert.throws(
    () => validateEvidenceManifest(value, { root, expectedCommit: 'c'.repeat(40) }),
    error => {
      assert.match(error.message, /does not exist/)
      assert.match(error.message, /state is unknown/)
      assert.match(error.message, /commit is stale/)
      return true
    }
  )
})

test('rejects checked-in artifact hash drift', () => {
  const root = fixtureRoot()
  const value = manifest()
  value.matrix[0].artifacts[0].sha256 = '0'.repeat(64)
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /sha256 does not match the checked-in artifact/
  )
})

test('normalizes checked-in text log line endings but hashes screenshots as exact bytes', () => {
  const root = fixtureRoot()
  const logPath = join(root, 'docs', 'qa', 'evidence', 'run.log')
  writeFileSync(logPath, 'first\r\nsecond\r\n')

  const value = manifest()
  value.matrix[0].artifacts[0] = {
    type: 'log',
    storage: 'checked-in',
    path: 'docs/qa/evidence/run.log',
    sha256: createHash('sha256').update('first\nsecond\n').digest('hex')
  }
  assert.equal(validateEvidenceManifest(value, { root }).rows, 2)

  value.matrix[0].artifacts[0].type = 'screenshot'
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /sha256 does not match the checked-in artifact/
  )
  value.matrix[0].artifacts[0].sha256 = createHash('sha256').update('first\r\nsecond\r\n').digest('hex')
  assert.equal(validateEvidenceManifest(value, { root }).rows, 2)
})

test('scans checked-in log contents before accepting their manifest', () => {
  const root = fixtureRoot()
  const findings = [
    'authorization: Basic dXNlcjpwYXNz',
    '{"token":"plain-token-value"}',
    'GET https://127.0.0.1/private',
    'open file:///Users/alice/private.log'
  ]

  for (const contents of findings) {
    writeFileSync(join(root, 'docs', 'qa', 'evidence', 'run.log'), contents)
    const value = manifest()
    value.matrix[0].artifacts[0] = {
      type: 'log',
      storage: 'checked-in',
      path: 'docs/qa/evidence/run.log',
      sha256: createHash('sha256').update(contents).digest('hex')
    }
    assert.throws(
      () => validateEvidenceManifest(value, { root }),
      /checked-in log contains (?:secret-like text|an unsafe URL|a private file URI)/
    )
  }

  const redactedContents = 'authorization: <redacted>\nrequest completed'
  writeFileSync(join(root, 'docs', 'qa', 'evidence', 'run.log'), redactedContents)
  const value = manifest()
  value.matrix[0].artifacts[0] = {
    type: 'log',
    storage: 'checked-in',
    path: 'docs/qa/evidence/run.log',
    sha256: createHash('sha256').update(redactedContents).digest('hex')
  }
  assert.equal(validateEvidenceManifest(value, { root }).rows, 2)
})

test('requires Orca Computer Use paths and Android device metadata', () => {
  const root = fixtureRoot()
  const value = manifest()
  value.matrix[0].operationPath[0].tool = 'playwright'
  delete value.matrix[1].target.apiLevel
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /orca-computer-use[\s\S]*apiLevel is required/
  )
})

test('rejects secrets, credential URLs, private URLs, and file URIs', () => {
  const root = fixtureRoot()
  const mutations = [
    value => { value.cookie = 'session=secret' },
    value => { value.token = 'plain-token-value' },
    value => { value.session = 'plain-session-value' },
    value => { value.secret = 'plain-secret-value' },
    value => { value.credential = 'plain-credential-value' },
    value => { value.matrix[0].operationPath[0].target = 'Bearer abc.def.ghi' },
    value => { value.matrix[0].operationPath[0].target = 'session=plain-session-value' },
    value => { value.matrix[0].operationPath[0].target = 'https://user:pass@example.invalid/private' },
    value => { value.matrix[0].operationPath[0].target = 'http://127.0.0.1/private' },
    value => { value.matrix[0].operationPath[0].target = 'file:///Users/alice/private.log' }
  ]
  for (const mutate of mutations) {
    const value = manifest()
    mutate(value)
    assert.throws(() => validateEvidenceManifest(value, { root }), /sensitive|secret|unsafe URL|file URI/)
  }
})

test('rejects and redacts non-public IPv6 URLs while retaining public IPv6', () => {
  const root = fixtureRoot()
  const privateUrls = [
    'https://[::]/private',
    'https://[::1]/private',
    'https://[::ffff:127.0.0.1]/private',
    'https://[::ffff:8.8.8.8]/private',
    'https://[fe80::1]/private',
    'https://[fd12:3456:789a::1]/private',
    'https://[ff02::1]/private',
    'https://[2001:db8::1]/private'
  ]

  for (const privateUrl of privateUrls) {
    const value = manifest()
    value.matrix[0].operationPath[0].target = privateUrl
    assert.throws(() => validateEvidenceManifest(value, { root }), /unsafe URL/)
    assert.equal(redactText(privateUrl), '<redacted-url>')
  }

  const publicUrl = 'https://[2001:4860:4860::8888]/dns'
  const value = manifest()
  value.matrix[0].operationPath[0].target = publicUrl
  assert.equal(validateEvidenceManifest(value, { root }).rows, 2)
  assert.equal(redactText(publicUrl), publicUrl)
})

test('matches schema strictness for viewport properties and RFC3339 date-time', () => {
  const root = fixtureRoot()
  const invalidDates = [
    '2026-08-17 00:00:00Z',
    '2026-02-29T00:00:00Z',
    '2026-08-17T00:00:00+24:00'
  ]

  for (const generatedAt of invalidDates) {
    const value = manifest()
    value.generatedAt = generatedAt
    assert.throws(() => validateEvidenceManifest(value, { root }), /RFC3339 date-time/)
  }

  const value = manifest()
  value.matrix[0].display.viewport.deviceScaleFactor = 2
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /viewport\.deviceScaleFactor is not allowed/
  )

  value.matrix[0].display.viewport = { width: 1280, height: 720 }
  value.matrix[0].artifacts[0].path = 'docs/qa/evidence/screen image.png'
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /path does not match the manifest schema/
  )
})

test('CLI resolves Git HEAD when --commit is omitted and rejects a stale manifest', () => {
  const root = fixtureRoot()
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'qa@example.invalid'], { cwd: root })
  execFileSync('git', ['config', 'user.name', 'QA Test'], { cwd: root })
  writeFileSync(join(root, 'tracked.txt'), 'baseline')
  execFileSync('git', ['add', 'tracked.txt'], { cwd: root })
  execFileSync('git', ['commit', '--quiet', '-m', 'baseline'], { cwd: root })
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const value = manifest()
  value.commit = head
  const manifestPath = join(root, 'docs', 'qa', 'evidence', 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(value))

  const accepted = spawnSync(process.execPath, [scriptPath, 'validate', manifestPath], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(accepted.status, 0, accepted.stderr)

  value.commit = 'c'.repeat(40)
  writeFileSync(manifestPath, JSON.stringify(value))
  const rejected = spawnSync(process.execPath, [scriptPath, 'validate', manifestPath], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.notEqual(rejected.status, 0)
  assert.match(rejected.stderr, /commit is stale/)

  const bypassAttempt = spawnSync(
    process.execPath,
    [scriptPath, 'validate', manifestPath, '--commit', value.commit],
    { cwd: root, encoding: 'utf8' }
  )
  assert.notEqual(bypassAttempt.status, 0)
  assert.match(bypassAttempt.stderr, /--commit must equal the current Git HEAD/)
})

test('redacts structured secrets and identifying URL or path data', () => {
  assert.deepEqual(redactEvidence({
    authorization: 'Bearer abc.def.ghi',
    token: 'plain-token-value',
    session: 'plain-session-value',
    secret: 'plain-secret-value',
    credential: 'plain-credential-value',
    log: 'GET https://example.invalid/path?token=secret from C:\\Users\\alice\\private\\log.txt'
  }), {
    authorization: '<redacted>',
    token: '<redacted>',
    session: '<redacted>',
    secret: '<redacted>',
    credential: '<redacted>',
    log: 'GET https://example.invalid/path from <redacted-path>'
  })
  assert.equal(redactText('open file:///home/alice/private.log'), 'open <redacted-file-uri>')
  assert.equal(redactText('session=plain-session-value'), '<redacted>')
  assert.equal(redactText('authorization: <redacted>'), 'authorization: <redacted>')
})

test('accepts the checked-in deterministic fixture catalog', () => {
  const catalog = JSON.parse(readFileSync(
    new URL('../../docs/qa/fixtures/catalog.v1.json', import.meta.url),
    'utf8'
  ))
  const root = fileURLToPath(new URL('../..', import.meta.url))
  assert.equal(validateFixtureCatalog(catalog, { root }).fixtures, 6)
})

test('rejects fixture drift and missing canonical states', () => {
  const catalog = JSON.parse(readFileSync(
    new URL('../../docs/qa/fixtures/catalog.v1.json', import.meta.url),
    'utf8'
  ))
  const root = fileURLToPath(new URL('../..', import.meta.url))
  catalog.fixtures[0].sha256 = '0'.repeat(64)
  catalog.fixtures.pop()
  assert.throws(
    () => validateFixtureCatalog(catalog, { root }),
    error => {
      assert.match(error.message, /does not match/)
      assert.match(error.message, /missing state success/)
      return true
    }
  )
})
