import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { summarizeResults, scanFirstPartyCredentials, validateGeneratedCatalog } from './gate.mjs'

const roots = []
test.after(async () => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))))

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex')

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'z-music-lint-gate-'))
  roots.push(root)
  const artifactPath = 'src/static/audio_match/afp.js'
  const contents = 'generated fingerprint runtime'
  await mkdir(path.join(root, 'src/static/audio_match'), { recursive: true })
  await writeFile(path.join(root, artifactPath), contents)
  return {
    root,
    artifactPath,
    catalog: {
      schemaVersion: '1.0',
      kind: 'generated-code-lint-boundary',
      artifacts: [{
        path: artifactPath,
        sha256: sha256(contents),
        hashMode: 'lf-text',
        lintExcluded: true,
        textScan: true,
        source: { description: 'fixture generated code', reference: 'https://example.com/source' },
      }],
    },
  }
}

test('accepts an exact generated-code catalog and ignore boundary', async () => {
  const { root, artifactPath, catalog } = await fixture()
  assert.deepEqual(await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: [artifactPath],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [artifactPath],
  }), [])
})

test('rejects hash drift, broad ignore drift, secrets, and private URLs', async () => {
  const { root, artifactPath, catalog } = await fixture()
  catalog.artifacts[0].sha256 = '0'.repeat(64)
  await writeFile(path.join(root, artifactPath), "const apiKey = 'fixture-secret-value'; const url = 'http://127.0.0.1:4174'")
  const errors = await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: ['src/main/**', artifactPath],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [artifactPath],
  })
  assert.ok(errors.some((error) => error.includes('sha256 does not match')))
  assert.ok(errors.some((error) => error.includes('credential-like text')))
  assert.ok(errors.some((error) => error.includes('development/private URL')))
  assert.ok(errors.some((error) => error.includes('ignore patterns must exactly match')))
})

test('rejects unsafe and duplicated paths', async () => {
  const { root, catalog } = await fixture()
  catalog.artifacts.push({ ...catalog.artifacts[0] })
  catalog.artifacts.push({ path: '../escape.js', sha256: '0'.repeat(64), lintExcluded: false, textScan: true })
  const errors = await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: [catalog.artifacts[0].path],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [catalog.artifacts[0].path],
  })
  assert.ok(errors.some((error) => error.includes('duplicated')))
  assert.ok(errors.some((error) => error.includes('safe repository-relative POSIX path')))
})

test('rejects unapproved generated paths and disabled JavaScript scans', async () => {
  const { root, artifactPath, catalog } = await fixture()
  catalog.artifacts[0].textScan = false
  const maintainedPath = 'src/renderer/utils/audioMatch/index.ts'
  await mkdir(path.join(root, 'src/renderer/utils/audioMatch'), { recursive: true })
  await writeFile(path.join(root, maintainedPath), 'export const maintained = true')
  catalog.artifacts.push({
    path: maintainedPath,
    sha256: sha256('export const maintained = true'),
    hashMode: 'lf-text',
    lintExcluded: true,
    textScan: true,
    source: { description: 'maintained fixture', reference: 'https://example.com/maintained' },
  })

  const errors = await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: [artifactPath, maintainedPath],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [artifactPath],
  })
  assert.ok(errors.some((error) => error.includes('textScan must be true')))
  assert.ok(errors.some((error) => error.includes('approved generated artifact set')))
})

test('normalizes CRLF for text artifact hashes but not binary hashes', async () => {
  const { root, artifactPath, catalog } = await fixture()
  await writeFile(path.join(root, artifactPath), 'generated fingerprint runtime\r\n')
  catalog.artifacts[0].sha256 = sha256('generated fingerprint runtime\n')
  assert.deepEqual(await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: [artifactPath],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [artifactPath],
  }), [])

  catalog.artifacts[0].hashMode = 'binary'
  catalog.artifacts[0].textScan = false
  const errors = await validateGeneratedCatalog(catalog, {
    root,
    ignorePatterns: [artifactPath],
    baseIgnorePatterns: [],
    expectedArtifactPaths: [artifactPath],
  })
  assert.ok(errors.some((error) => error.includes('sha256 does not match')))
})

test('scans first-party source for credential literals without flagging fixture or protocol constants', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'z-music-lint-source-'))
  roots.push(root)
  const sourceDir = path.join(root, 'src')
  await mkdir(sourceDir, { recursive: true })
  const unsafe = path.join(sourceDir, 'unsafe.ts')
  const safe = path.join(sourceDir, 'safe.ts')
  const fixtureTest = path.join(sourceDir, 'fixture.test.ts')
  await writeFile(unsafe, "const accessToken = 'gitcode_fixture_token_value'")
  await writeFile(safe, "const eapiKey = 'public-protocol-constant'")
  await writeFile(fixtureTest, "const password = 'fixture-password-value'; const auth = 'Bearer test-token-value'")

  assert.deepEqual(await scanFirstPartyCredentials([
    { filePath: unsafe, ignored: false },
    { filePath: safe, ignored: false },
    { filePath: fixtureTest, ignored: false },
  ], { root }), ['src/unsafe.ts'])
})

test('summarizes warnings and errors by rule', () => {
  const results = [{
    filePath: path.join(process.cwd(), 'src/example.ts'),
    messages: [
      { line: 1, column: 1, ruleId: 'no-unused-vars', severity: 1, message: 'warning' },
      { line: 2, column: 1, ruleId: 'no-undef', severity: 2, message: 'error' },
    ],
  }]
  const summary = summarizeResults(results)
  assert.equal(summary.files, 1)
  assert.equal(summary.warnings, 1)
  assert.equal(summary.errors, 1)
  assert.deepEqual(summary.byRule, { 'no-undef': 1, 'no-unused-vars': 1 })
})
