import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDesktopRcMatrix } from './desktopRcMatrix.mjs'

const [commit, output = 'docs/qa/evidence/desktop-rc.manifest.json'] = process.argv.slice(2)
if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
  console.error('Usage: node scripts/qa/generateDesktopRcEvidence.mjs <40-char-commit> [output]')
  process.exit(1)
}
const logPath = resolve('docs/qa/evidence/desktop-rc-agent-browser.log')
const log = readFileSync(logPath, 'utf8').replace(/\r\n/g, '\n')
if (log.includes('PENDING LIVE RUN') || !log.includes('result: PASS')) {
  throw new Error('Desktop RC live agent-browser log is not complete')
}
const sha256 = createHash('sha256').update(log).digest('hex')
const manifest = {
  schemaVersion: '1.0',
  kind: 'executable-product-evidence',
  commit,
  generatedAt: new Date().toISOString(),
  fixtureCatalog: { version: '1.0', path: 'docs/qa/fixtures/catalog.v1.json' },
  matrix: createDesktopRcMatrix(sha256),
}
writeFileSync(resolve(output), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ output, rows: manifest.matrix.length, commit, sha256 }))
