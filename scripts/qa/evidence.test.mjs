import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  evidenceStates,
  redactEvidence,
  redactText,
  renderEvidenceTemplate,
  validateEvidenceManifest,
  validateEvidenceSchema,
  validateFixtureCatalog,
  verifyEvidenceBundle
} from './evidence.mjs'

const commit = 'a'.repeat(40)
const checkedInArtifact = 'fixture screenshot'
const checkedInDigest = createHash('sha256').update(checkedInArtifact).digest('hex')
const scriptPath = resolve(fileURLToPath(new URL('./evidence.mjs', import.meta.url)))
const qaRootUrl = new URL('../../docs/qa/', import.meta.url)
const schemaSource = readFileSync(new URL('schema/evidence-manifest.v1.schema.json', qaRootUrl), 'utf8')
const roots = []

test.after(() => {
  roots.forEach(root => rmSync(root, { recursive: true, force: true }))
})

function fixtureRoot () {
  const root = mkdtempSync(join(tmpdir(), 'z-music-desktop-evidence-'))
  roots.push(root)
  mkdirSync(join(root, 'docs', 'qa', 'evidence'), { recursive: true })
  mkdirSync(join(root, 'docs', 'qa', 'fixtures', 'states'), { recursive: true })
  mkdirSync(join(root, 'docs', 'qa', 'schema'), { recursive: true })
  writeFileSync(join(root, 'docs', 'qa', 'evidence', 'screen.png'), checkedInArtifact)
  writeFileSync(
    join(root, 'docs', 'qa', 'fixtures', 'catalog.v1.json'),
    readFileSync(new URL('fixtures/catalog.v1.json', qaRootUrl))
  )
  for (const state of evidenceStates) {
    writeFileSync(
      join(root, 'docs', 'qa', 'fixtures', 'states', `${state}.json`),
      readFileSync(new URL(`fixtures/states/${state}.json`, qaRootUrl))
    )
  }
  writeFileSync(join(root, 'docs', 'qa', 'schema', 'evidence-manifest.v1.schema.json'), schemaSource)
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
          { tool: 'agent-browser', action: 'click', target: 'Library navigation item' }
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
        artifacts: [artifact()],
        result: 'PASS'
      }
    ]
  }
}

test('accepts complete Electron and Android matrix rows through the JSON schema', () => {
  const root = fixtureRoot()
  const value = manifest()
  assert.equal(validateEvidenceSchema(value, { root }), true)
  assert.deepEqual(validateEvidenceManifest(value, { root, expectedCommit: commit }), {
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

test('rejects fixture drift while validating a manifest', () => {
  const root = fixtureRoot()
  writeFileSync(
    join(root, 'docs', 'qa', 'fixtures', 'states', 'success.json'),
    '{"state":"success","items":[]}'
  )
  assert.throws(
    () => validateEvidenceManifest(manifest(), { root }),
    /fixtureCatalog[\s\S]*sha256 does not match/
  )
})

test('requires agent-browser paths and Android device metadata', () => {
  const root = fixtureRoot()
  const value = manifest()
  value.matrix[0].operationPath[0].tool = 'legacy-browser-tool'
  value.matrix[1].operationPath[0].tool = 'agent-browser'
  delete value.matrix[1].target.apiLevel
  assert.throws(
    () => validateEvidenceManifest(value, { root }),
    /agent-browser[\s\S]*apiLevel is required[\s\S]*Android device or emulator tooling/
  )
})

test('validates mapped CI artifacts, hashes, and redacted contents', () => {
  const root = fixtureRoot()
  const artifactRoot = join(root, 'ci-artifacts', 'lint-quality-report')
  mkdirSync(artifactRoot, { recursive: true })
  const contents = 'quality gate passed\n'
  writeFileSync(join(artifactRoot, 'report.log'), contents)
  const value = manifest()
  value.matrix[1].artifacts[0] = {
    type: 'log',
    storage: 'ci-artifact',
    path: 'report.log',
    artifactName: 'lint-quality-report',
    sha256: createHash('sha256').update(contents).digest('hex')
  }

  assert.equal(validateEvidenceManifest(value, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot }
  }).rows, 2)

  assert.throws(() => validateEvidenceManifest(value, { root }), /has no supplied artifact root/)
  value.matrix[1].artifacts[0].sha256 = '0'.repeat(64)
  assert.throws(() => validateEvidenceManifest(value, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot }
  }), /sha256 does not match/)

  writeFileSync(join(artifactRoot, 'report.log'), 'authorization: Basic dXNlcjpwYXNz')
  value.matrix[1].artifacts[0].sha256 = createHash('sha256')
    .update('authorization: Basic dXNlcjpwYXNz')
    .digest('hex')
  assert.throws(() => validateEvidenceManifest(value, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot }
  }), /log contains secret-like text/)
})

test('rejects symlinked CI artifacts even when the manifest path stays inside the root', (t) => {
  const root = fixtureRoot()
  const artifactRoot = join(root, 'ci-artifacts', 'lint-quality-report')
  mkdirSync(artifactRoot, { recursive: true })
  const outside = join(root, 'outside.log')
  const linked = join(artifactRoot, 'linked.log')
  writeFileSync(outside, 'quality gate passed\n')
  try {
    symlinkSync(outside, linked, 'file')
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('symlinks require elevated Windows privileges')
    throw error
  }
  const value = manifest()
  value.matrix[1].artifacts[0] = {
    type: 'log',
    storage: 'ci-artifact',
    path: 'linked.log',
    artifactName: 'lint-quality-report',
    sha256: createHash('sha256').update('quality gate passed\n').digest('hex')
  }
  assert.throws(() => validateEvidenceManifest(value, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot }
  }), /regular non-symlink file|resolves outside/)
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

test('renders a template for Git HEAD and rejects stale commit bypasses', () => {
  const root = fixtureRoot()
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'qa@example.invalid'], { cwd: root })
  execFileSync('git', ['config', 'user.name', 'QA Test'], { cwd: root })
  writeFileSync(join(root, 'tracked.txt'), 'baseline')
  execFileSync('git', ['add', 'tracked.txt'], { cwd: root })
  execFileSync('git', ['commit', '--quiet', '-m', 'baseline'], { cwd: root })
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const template = manifest()
  template.commit = '__CURRENT_COMMIT__'
  template.generatedAt = '__GENERATED_AT__'
  for (const row of template.matrix) {
    for (const artifact of row.artifacts) artifact.sha256 = '__SHA256__'
  }
  const templatePath = join(root, 'docs', 'qa', 'evidence', 'template.json')
  const manifestPath = join(root, 'docs', 'qa', 'evidence', 'manifest.json')
  writeFileSync(templatePath, JSON.stringify(template))

  const rendered = spawnSync(process.execPath, [
    scriptPath,
    'render',
    templatePath,
    manifestPath,
    '--commit',
    head,
    '--generated-at',
    '2026-08-23T00:00:00Z'
  ], { cwd: root, encoding: 'utf8' })
  assert.equal(rendered.status, 0, rendered.stderr)

  const accepted = spawnSync(process.execPath, [scriptPath, 'validate', manifestPath], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.equal(accepted.status, 0, accepted.stderr)

  const bypassAttempt = spawnSync(process.execPath, [
    scriptPath,
    'render',
    templatePath,
    manifestPath,
    '--commit',
    'c'.repeat(40),
    '--generated-at',
    '2026-08-23T00:00:00Z'
  ], { cwd: root, encoding: 'utf8' })
  assert.notEqual(bypassAttempt.status, 0)
  assert.match(bypassAttempt.stderr, /--commit must equal the current Git HEAD/)

  const stale = JSON.parse(readFileSync(manifestPath, 'utf8'))
  stale.commit = 'c'.repeat(40)
  writeFileSync(manifestPath, JSON.stringify(stale))
  const rejected = spawnSync(process.execPath, [scriptPath, 'validate', manifestPath], {
    cwd: root,
    encoding: 'utf8'
  })
  assert.notEqual(rejected.status, 0)
  assert.match(rejected.stderr, /commit is stale/)
})

test('requires canonical placeholders when rendering evidence templates', () => {
  const value = manifest()
  assert.throws(() => renderEvidenceTemplate(value, {
    commit,
    generatedAt: '2026-08-23T00:00:00Z'
  }), /canonical commit and generatedAt placeholders/)
  value.commit = '__CURRENT_COMMIT__'
  value.generatedAt = '__GENERATED_AT__'
  for (const row of value.matrix) {
    for (const artifact of row.artifacts) artifact.sha256 = '__SHA256__'
  }
  assert.equal(renderEvidenceTemplate(value, {
    root: fixtureRoot(),
    commit,
    generatedAt: '2026-08-23T00:00:00Z'
  }).commit, commit)
})

test('renders and validates the checked-in Repository Ready template', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const template = JSON.parse(readFileSync(
    new URL('../../docs/qa/evidence/repository-ready.template.json', import.meta.url),
    'utf8'
  ))
  const artifactRoot = mkdtempSync(join(tmpdir(), 'z-music-lint-artifact-'))
  roots.push(artifactRoot)
  const lintReport = '{"schemaVersion":"1.0","result":"PASS"}\n'
  writeFileSync(join(artifactRoot, 'report.json'), lintReport)
  const rendered = renderEvidenceTemplate(template, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot },
    commit,
    generatedAt: '2026-08-23T00:00:00Z'
  })
  assert.equal(validateEvidenceManifest(rendered, {
    root,
    artifactRoots: { 'lint-quality-report': artifactRoot },
    expectedCommit: commit
  }).rows, 1)
})

test('verifies a self-contained evidence bundle and rejects tampering', () => {
  const bundleRoot = fixtureRoot()
  const smokeTarget = join(bundleRoot, 'docs', 'qa', 'evidence', 'repository-ready-smoke.txt')
  writeFileSync(
    smokeTarget,
    readFileSync(new URL('../../docs/qa/evidence/repository-ready-smoke.txt', import.meta.url))
  )
  const lintRoot = join(bundleRoot, 'artifacts', 'lint-quality-report')
  mkdirSync(lintRoot, { recursive: true })
  writeFileSync(join(lintRoot, 'report.json'), '{"schemaVersion":"1.0","result":"PASS"}\n')
  const template = JSON.parse(readFileSync(
    new URL('../../docs/qa/evidence/repository-ready.template.json', import.meta.url),
    'utf8'
  ))
  const manifest = renderEvidenceTemplate(template, {
    root: bundleRoot,
    artifactRoots: { 'lint-quality-report': lintRoot },
    commit,
    generatedAt: '2026-08-23T00:00:00Z'
  })
  const manifestPath = join(bundleRoot, 'repository-ready.manifest.json')
  const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`
  writeFileSync(manifestPath, manifestContents)
  writeFileSync(
    join(bundleRoot, 'repository-ready.manifest.json.sha256'),
    `${createHash('sha256').update(manifestContents).digest('hex')}  repository-ready.manifest.json\n`
  )
  assert.equal(verifyEvidenceBundle(bundleRoot, { expectedCommit: commit }).rows, 1)

  writeFileSync(manifestPath, `${manifestContents} `)
  assert.throws(
    () => verifyEvidenceBundle(bundleRoot, { expectedCommit: commit }),
    /sidecar does not match/
  )
  writeFileSync(manifestPath, manifestContents)
  assert.throws(
    () => verifyEvidenceBundle(bundleRoot, { expectedCommit: 'b'.repeat(40) }),
    /commit is stale/
  )
})

test('keeps CI artifact names traceable from the template to the workflow', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/quality-gate.yml', import.meta.url),
    'utf8'
  )
  const template = readFileSync(
    new URL('../../docs/qa/evidence/repository-ready.template.json', import.meta.url),
    'utf8'
  )
  assert.match(template, /"artifactName": "lint-quality-report"/)
  assert.match(workflow, /name: lint-quality-report/)
  assert.match(workflow, /name: repository-ready-evidence/)
  assert.match(workflow, /evidence\.mjs render/)
  assert.match(workflow, /evidence\.mjs validate/)
  assert.match(workflow, /--artifact-root lint-quality-report=\.artifacts\/lint/)
  assert.match(workflow, /cp docs\/qa\/evidence\/repository-ready-smoke\.txt/)
  assert.match(workflow, /cp \.artifacts\/lint\/report\.json/)
  assert.match(workflow, /evidence\.mjs verify-bundle/)
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
