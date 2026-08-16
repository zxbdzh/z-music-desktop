import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { deflateRawSync } from 'node:zlib'

import { scanApk } from './scan-apk.mjs'

function createZip(entries) {
  const localParts = []
  const centralParts = []
  let localOffset = 0

  for (const [name, value] of Object.entries(entries)) {
    const fileName = Buffer.from(name)
    const content = Buffer.from(value)
    const compressed = deflateRawSync(content)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(fileName.length, 26)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(fileName.length, 28)
    centralHeader.writeUInt32LE(localOffset, 42)

    localParts.push(localHeader, fileName, compressed)
    centralParts.push(centralHeader, fileName)
    localOffset += localHeader.length + fileName.length + compressed.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(centralParts.length / 2, 8)
  end.writeUInt16LE(centralParts.length / 2, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(localOffset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

test('APK scanner fails when the APK is missing', () => {
  assert.throws(() => scanApk(join(tmpdir(), 'missing-z-music-debug.apk')), /ENOENT/)
})

test('APK scanner inspects decompressed packaged contents', t => {
  const directory = mkdtempSync(join(tmpdir(), 'z-music-apk-scan-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const apkPath = join(directory, 'app-debug.apk')
  writeFileSync(apkPath, createZip({
    'assets/public/index.js': "const updater = require('electron-updater')",
    'classes.dex': Buffer.from('process.versions.node', 'utf16le'),
    'assets/public/config.json': '{"apiKey":"packaged-secret","Authorization":"Bearer packaged-token","baseUrl":"https://music.zxbdwy.online/api"}',
    'assets/public/server.js': "import 'node:path'; const url = 'http://localhost:4174/?debug=1'"
  }))

  const result = scanApk(apkPath)
  assert.equal(result.entriesScanned, 4)
  assert.deepEqual(result.findings, [
    'assets/public/index.js: Electron or Node import',
    'assets/public/index.js: Electron runtime',
    'classes.dex: Node import or runtime',
    'assets/public/config.json: author-owned API default',
    'assets/public/config.json: literal credential',
    'assets/public/config.json: literal bearer or private key',
    'assets/public/server.js: Electron or Node import',
    'assets/public/server.js: Node import or runtime',
    'assets/public/server.js: development-server URL'
  ])
})

test('APK scanner accepts a clean compressed package', t => {
  const directory = mkdtempSync(join(tmpdir(), 'z-music-apk-clean-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const apkPath = join(directory, 'app-debug.apk')
  writeFileSync(apkPath, createZip({ 'assets/public/index.js': 'console.log("z-music-desktop")' }))
  assert.deepEqual(scanApk(apkPath), { entriesScanned: 1, findings: [] })
})
