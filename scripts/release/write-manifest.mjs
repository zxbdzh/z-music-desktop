import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { DESKTOP_RELEASE } from './desktop-config.mjs'

const [commit, output = 'build/release-manifest.json', ...files] = process.argv.slice(2)
if (!/^[0-9a-f]{40}$/.test(commit ?? '') || files.length === 0) {
  throw new Error('Usage: node scripts/release/write-manifest.mjs <commit> [output] <artifact...>')
}
const hash = async (path) => {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(path)) digest.update(chunk)
  return digest.digest('hex')
}
const artifacts = []
for (const file of files) {
  const path = resolve(file)
  if (!existsSync(path)) throw new Error(`Missing release artifact: ${file}`)
  artifacts.push({ name: basename(path), bytes: statSync(path).size, sha256: await hash(path) })
}
const actualNames = artifacts.map(({ name }) => name).sort()
assertNames(actualNames, [...DESKTOP_RELEASE.windowsArtifacts].sort())
const manifest = {
  schemaVersion: '1.0',
  product: DESKTOP_RELEASE.productName,
  version: DESKTOP_RELEASE.version,
  commit,
  artifacts,
}
writeFileSync(resolve(output), `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(
  resolve('build/SHA256SUMS.txt'),
  `${artifacts.map(({ sha256, name }) => `${sha256}  ${name}`).join('\n')}\n`
)
console.log(JSON.stringify(manifest, null, 2))

function assertNames(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Artifact set mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}`)
  }
}
