import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const failures = []
const pass = (message) => console.log(`✓ ${message}`)
const fail = (message) => failures.push(message)
const file = (relativePath) => join(projectRoot, relativePath)

const requireFile = (relativePath) => {
  const target = file(relativePath)
  if (!existsSync(target) || statSync(target).size === 0) {
    fail(`${relativePath}: missing or empty`)
    return false
  }
  return true
}

const readPng = (relativePath) => {
  if (!requireFile(relativePath)) return null
  const data = readFileSync(file(relativePath))
  const signature = '89504e470d0a1a0a'
  if (data.subarray(0, 8).toString('hex') !== signature) {
    fail(`${relativePath}: invalid PNG signature`)
    return null
  }
  const width = data.readUInt32BE(16)
  const height = data.readUInt32BE(20)
  const colorType = data[25]
  return { width, height, colorType }
}

const assertPng = (relativePath, width, height, allowRgb = false) => {
  const png = readPng(relativePath)
  if (!png) return
  if (png.width !== width || png.height !== height) {
    fail(`${relativePath}: expected ${width}x${height}, got ${png.width}x${png.height}`)
  }
  const accepted = allowRgb ? [2, 6] : [4, 6]
  if (!accepted.includes(png.colorType)) {
    fail(`${relativePath}: expected ${allowRgb ? 'RGB/RGBA' : 'alpha-capable'} PNG, color type ${png.colorType}`)
  }
}

const assertIco = (relativePath, expectedSizes) => {
  if (!requireFile(relativePath)) return
  const data = readFileSync(file(relativePath))
  if (data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) {
    fail(`${relativePath}: invalid ICO header`)
    return
  }
  const count = data.readUInt16LE(4)
  const sizes = []
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16
    sizes.push(data[offset] || 256)
  }
  if (JSON.stringify(sizes) !== JSON.stringify(expectedSizes)) {
    fail(`${relativePath}: expected layers ${expectedSizes.join(',')}, got ${sizes.join(',')}`)
  }
}

const assertIcns = (relativePath, requiredChunks) => {
  if (!requireFile(relativePath)) return
  const data = readFileSync(file(relativePath))
  if (data.toString('ascii', 0, 4) !== 'icns' || data.readUInt32BE(4) !== data.length) {
    fail(`${relativePath}: invalid ICNS container`)
    return
  }
  const chunks = new Set()
  let offset = 8
  while (offset + 8 <= data.length) {
    const type = data.toString('ascii', offset, offset + 4)
    const size = data.readUInt32BE(offset + 4)
    if (size < 8 || offset + size > data.length) {
      fail(`${relativePath}: invalid ${type} chunk`)
      return
    }
    chunks.add(type)
    offset += size
  }
  for (const chunk of requiredChunks) {
    if (!chunks.has(chunk)) fail(`${relativePath}: missing ${chunk} chunk`)
  }
}

const desktopSizes = [16, 32, 48, 64, 128, 256, 512]
const androidLegacySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const androidForegroundSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
const splashSizes = [
  ['drawable/splash.png', 480, 320],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
]

assertPng('docs/brand/logo-master.png', 1024, 1024, true)
assertPng('docs/brand/logo-mark.png', 1024, 1024)
assertPng('doc/images/icon.png', 200, 200)
assertPng('.github/social-preview.png', 1280, 640, true)
for (const size of desktopSizes) {
  assertPng(`resources/icons/${size}x${size}.png`, size, size)
}
assertPng('resources/icons/icon.png', 512, 512)
assertIco('resources/icons/icon.ico', [16, 24, 32, 48, 64, 128, 256])
assertIcns('resources/icons/icon.icns', ['ic11', 'ic12', 'ic07', 'ic08', 'ic13', 'ic09', 'ic14', 'ic10'])

for (const [density, size] of Object.entries(androidLegacySizes)) {
  assertPng(`apps/android/android/app/src/main/res/mipmap-${density}/ic_launcher.png`, size, size)
  assertPng(`apps/android/android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`, size, size)
}
for (const [density, size] of Object.entries(androidForegroundSizes)) {
  assertPng(`apps/android/android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`, size, size)
}
assertPng('apps/android/android/app/src/main/res/drawable-nodpi/splash_logo.png', 512, 512)
for (const [relativePath, width, height] of splashSizes) {
  assertPng(`apps/android/android/app/src/main/res/${relativePath}`, width, height, true)
}

const readText = (relativePath) => readFileSync(file(relativePath), 'utf8')
const packageJson = JSON.parse(readText('package.json'))
const generationResponse = JSON.parse(readText('docs/brand/logo-generation-response.json'))
const hashText = (relativePath) =>
  createHash('sha256').update(readText(relativePath).replace(/\r\n/g, '\n').trimEnd()).digest('hex')
if (generationResponse.intended_prompt_sha256 !== hashText('docs/brand/logo-generation-prompt.md')) {
  fail('logo-generation-response.json: intended prompt SHA-256 mismatch')
}
if (
  generationResponse.actual_request_prompt_sha256 !==
  hashText('docs/brand/logo-generation-request-prompt.txt')
) {
  fail('logo-generation-response.json: actual request prompt SHA-256 mismatch')
}
if (JSON.stringify(generationResponse).includes('req_')) {
  fail('logo-generation-response.json: request identifier must not be committed')
}
if (packageJson.scripts?.['brand:generate'] !== 'node scripts/brand/generate-assets.mjs') {
  fail('package.json: brand:generate script is missing or changed')
}
if (packageJson.scripts?.['brand:check'] !== 'node scripts/brand/check-assets.mjs') {
  fail('package.json: brand:check script is missing or changed')
}

const readme = readText('README.md')
if (!readme.includes('src="doc/images/icon.png"')) fail('README.md: logo path is missing')
if (!readme.includes('docs/brand/README.md')) fail('README.md: brand asset documentation link is missing')

const manifest = readText('apps/android/android/app/src/main/AndroidManifest.xml')
if (!manifest.includes('android:icon="@mipmap/ic_launcher"')) fail('AndroidManifest.xml: launcher icon is not the mipmap asset')
if (!manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"')) fail('AndroidManifest.xml: round launcher icon is not the mipmap asset')
if (manifest.includes('ic_launcher_brand')) fail('AndroidManifest.xml: legacy brand vector is still referenced')

const splash = readText('apps/android/android/app/src/main/res/drawable/splash_brand.xml')
if (!splash.includes('@color/brand_surface') || !splash.includes('@drawable/splash_logo')) {
  fail('splash_brand.xml: approved logo layer is not referenced')
}

const foregroundFiles = [
  'apps/android/android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml',
  'apps/android/android/app/src/main/res/drawable/ic_launcher_background.xml',
  'apps/android/android/app/src/main/res/drawable/ic_launcher_brand.xml',
]
for (const relativePath of foregroundFiles) {
  if (existsSync(file(relativePath))) fail(`${relativePath}: obsolete launcher resource should be removed`)
}

const rendererHtml = readText('src/renderer/index.html')
if (rendererHtml.includes('logo-path-1') || rendererHtml.includes('logo-path-2')) {
  fail('src/renderer/index.html: legacy inline logo remains')
}

if (requireFile('docs/brand/generated-assets.json')) {
  const metadata = JSON.parse(readText('docs/brand/generated-assets.json'))
  const sha256 = (relativePath) => createHash('sha256').update(readFileSync(file(relativePath))).digest('hex')
  if (metadata.sourceSha256 !== sha256('docs/brand/logo-master.png')) fail('generated-assets.json: source SHA-256 mismatch')
  if (metadata.markSha256 !== sha256('docs/brand/logo-mark.png')) fail('generated-assets.json: mark SHA-256 mismatch')
}

if (failures.length > 0) {
  console.error(`Brand asset check failed (${failures.length}):`)
  failures.forEach((message) => console.error(`- ${message}`))
  process.exit(1)
}

pass('brand master and transparent mark')
pass('README and Social Preview assets')
pass('desktop PNG, ICO and ICNS layers')
pass('Android launcher, adaptive icon and splash assets')
pass('brand references and reproducibility metadata')
