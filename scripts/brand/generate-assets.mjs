import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const master = join(projectRoot, 'docs/brand/logo-master.png')
const mark = join(projectRoot, 'docs/brand/logo-mark.png')
const tempRoot = mkdtempSync(join(tmpdir(), 'z-music-brand-'))

const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${command} exited with ${result.status}${details ? `\n${details}` : ''}`)
  }
  return result.stdout?.trim() || ''
}

const ensureParent = (file) => mkdirSync(dirname(file), { recursive: true })

const renderPng = (input, size, output, pixelFormat = 'rgba') => {
  ensureParent(output)
  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-i',
    input,
    '-vf',
    `scale=${size}:${size}:flags=lanczos,format=${pixelFormat}`,
    '-frames:v',
    '1',
    output,
  ])
}

const renderAdaptiveForeground = (input, size, output) => {
  ensureParent(output)
  const contentSize = Math.round(size * 0.9)
  const before = Math.floor((size - contentSize) / 2)
  const after = size - contentSize - before
  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-i',
    input,
    '-vf',
    `scale=${contentSize}:${contentSize}:flags=lanczos,pad=${size}:${size}:${before}:${before}:color=0x00000000,format=rgba`,
    '-frames:v',
    '1',
    output,
  ])
  if (after < before || after > before + 1) throw new Error('Invalid adaptive icon padding')
}

const renderSplash = (input, width, height, output) => {
  ensureParent(output)
  const logoSize = Math.round(Math.min(width, height) * 0.34)
  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=0xFFFDFB:s=${width}x${height}`,
    '-i',
    input,
    '-filter_complex',
    `[1:v]scale=${logoSize}:${logoSize}:flags=lanczos[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto,format=rgb24`,
    '-frames:v',
    '1',
    output,
  ])
}

const filterPath = (file) => file.replaceAll('\\', '/').replace(/^([A-Za-z]):/, '$1\\:').replaceAll("'", "\\'")

const resolveSocialFonts = () => {
  const customRegular = process.env.BRAND_FONT_PATH
  const customBold = process.env.BRAND_BOLD_FONT_PATH || customRegular
  const pairs = [
    [customRegular, customBold],
    ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/segoeuib.ttf'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
    ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'],
    ['/Library/Fonts/Arial.ttf', '/Library/Fonts/Arial Bold.ttf'],
  ]

  const pair = pairs.find(([regular, bold]) => regular && bold && existsSync(regular) && existsSync(bold))
  if (!pair) {
    throw new Error('No supported Social Preview font found. Set BRAND_FONT_PATH and BRAND_BOLD_FONT_PATH.')
  }
  return pair
}

const renderSocialPreview = (input, output) => {
  ensureParent(output)
  const [regularFont, boldFont] = resolveSocialFonts()
  const regular = filterPath(regularFont)
  const bold = filterPath(boldFont)
  const filter = [
    '[1:v]scale=340:340:flags=lanczos[logo]',
    '[0:v][logo]overlay=110:(H-h)/2[base]',
    `[base]drawtext=fontfile='${bold}':text='z-music-desktop':fontcolor=0x171A1C:fontsize=68:x=520:y=220[text]`,
    `[text]drawtext=fontfile='${regular}':text='Desktop + Android music client':fontcolor=0x68716D:fontsize=30:x=524:y=320,format=rgb24`,
  ].join(';')

  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0xFFFDFB:s=1280x640',
    '-i',
    input,
    '-filter_complex',
    filter,
    '-frames:v',
    '1',
    output,
  ])
}

const renderIco = (input, output) => {
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const icoDir = join(tempRoot, 'ico')
  mkdirSync(icoDir, { recursive: true })
  const images = sizes.map((size) => {
    const file = join(icoDir, `${size}.png`)
    renderPng(input, size, file)
    return file
  })

  const args = ['-v', 'error', '-y']
  for (const image of images) args.push('-i', image)
  for (let index = 0; index < images.length; index += 1) args.push('-map', `${index}:v:0`)
  args.push('-frames:v', '1', '-c:v', 'png', output)
  ensureParent(output)
  run(ffmpeg, args)
}

const resolveAppBuilder = () => {
  const projectRequire = createRequire(join(projectRoot, 'package.json'))
  const electronBuilderPackage = projectRequire.resolve('electron-builder/package.json')
  const electronBuilderRequire = createRequire(electronBuilderPackage)
  return electronBuilderRequire('app-builder-bin').appBuilderPath
}

const renderIcns = (input, output) => {
  const outDir = join(tempRoot, 'icns')
  mkdirSync(outDir, { recursive: true })
  const response = run(
    resolveAppBuilder(),
    ['icon', '--format=icns', `--out=${outDir}`, `--input=${input}`],
    true
  )
  const payload = JSON.parse(response)
  if (payload.error) throw new Error(payload.error)
  const generated = readdirSync(outDir).find((file) => file.endsWith('.icns'))
  if (!generated) throw new Error('app-builder did not produce an ICNS file')
  ensureParent(output)
  copyFileSync(join(outDir, generated), output)
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

try {
  if (!existsSync(master)) throw new Error(`Missing approved master: ${master}`)

  ensureParent(mark)
  run(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-i',
    master,
    '-vf',
    'colorkey=0xFFFDFB:0.055:0.025,format=rgba',
    '-frames:v',
    '1',
    mark,
  ])

  renderPng(mark, 200, join(projectRoot, 'doc/images/icon.png'))
  for (const size of desktopSizes) {
    renderPng(mark, size, join(projectRoot, `resources/icons/${size}x${size}.png`))
  }
  renderPng(mark, 512, join(projectRoot, 'resources/icons/icon.png'))
  renderIco(mark, join(projectRoot, 'resources/icons/icon.ico'))
  renderIcns(mark, join(projectRoot, 'resources/icons/icon.icns'))
  renderSocialPreview(mark, join(projectRoot, '.github/social-preview.png'))

  const androidRes = join(projectRoot, 'apps/android/android/app/src/main/res')
  for (const [density, size] of Object.entries(androidLegacySizes)) {
    renderPng(mark, size, join(androidRes, `mipmap-${density}/ic_launcher.png`))
    renderPng(mark, size, join(androidRes, `mipmap-${density}/ic_launcher_round.png`))
  }
  for (const [density, size] of Object.entries(androidForegroundSizes)) {
    renderAdaptiveForeground(mark, size, join(androidRes, `mipmap-${density}/ic_launcher_foreground.png`))
  }
  renderPng(mark, 512, join(androidRes, 'drawable-nodpi/splash_logo.png'))
  for (const [relativePath, width, height] of splashSizes) {
    renderSplash(mark, width, height, join(androidRes, relativePath))
  }

  const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
  const metadata = {
    schemaVersion: 1,
    source: 'docs/brand/logo-master.png',
    sourceSha256: sha256(master),
    mark: 'docs/brand/logo-mark.png',
    markSha256: sha256(mark),
    desktopPngSizes: desktopSizes,
    windowsIcoSizes: [16, 24, 32, 48, 64, 128, 256],
    androidLegacySizes,
    androidForegroundSizes,
    socialPreview: '1280x640',
  }
  writeFileSync(join(projectRoot, 'docs/brand/generated-assets.json'), `${JSON.stringify(metadata, null, 2)}\n`)
  console.log('Brand assets generated from docs/brand/logo-master.png')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
