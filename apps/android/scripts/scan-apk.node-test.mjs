import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createWriteStream, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import yazl from 'yazl'

import { scanApk } from './scan-apk.mjs'

const scannerPath = fileURLToPath(new URL('./scan-apk.mjs', import.meta.url))

async function writeZip(filePath, entries) {
  const zipfile = new yazl.ZipFile()
  for (const [name, value] of Object.entries(entries)) {
    zipfile.addBuffer(Buffer.from(value), name, { compress: false })
  }
  const output = createWriteStream(filePath)
  const completed = new Promise((resolve, reject) => {
    output.once('finish', resolve)
    output.once('error', reject)
    zipfile.outputStream.once('error', reject)
  })
  zipfile.outputStream.pipe(output)
  zipfile.end()
  await completed
}

function mutateHeaderField(archive, signature, fieldOffset, mutate) {
  const signatureBuffer = Buffer.alloc(4)
  signatureBuffer.writeUInt32LE(signature)
  let offset = 0
  let mutations = 0
  while ((offset = archive.indexOf(signatureBuffer, offset)) >= 0) {
    const field = offset + fieldOffset
    archive.writeUInt16LE(mutate(archive.readUInt16LE(field)), field)
    offset += 4
    mutations += 1
  }
  assert.ok(mutations > 0, `fixture did not contain signature ${signature.toString(16)}`)
}

function mutateHeaderUInt32(archive, signature, fieldOffset, mutate) {
  const signatureBuffer = Buffer.alloc(4)
  signatureBuffer.writeUInt32LE(signature)
  let offset = 0
  let mutations = 0
  while ((offset = archive.indexOf(signatureBuffer, offset)) >= 0) {
    const field = offset + fieldOffset
    archive.writeUInt32LE(mutate(archive.readUInt32LE(field)), field)
    offset += 4
    mutations += 1
  }
  assert.ok(mutations > 0, `fixture did not contain signature ${signature.toString(16)}`)
}

function validApkEntries(extra = {}) {
  return {
    'AndroidManifest.xml': Buffer.from('<manifest package="io.github.zxbdzh.zmusic"/>'),
    'classes.dex': Buffer.from('dex\nclean-runtime'),
    ...extra
  }
}

function temporaryDirectory(t, prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return directory
}

test('APK scanner rejects missing and unreadable inputs', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-input-')
  const missingPath = join(directory, 'missing.apk')
  await assert.rejects(scanApk(missingPath), /ENOENT/)
  await assert.rejects(scanApk(directory), /(?:EISDIR|illegal file data|end of central directory|not a zip)/i)
  const cli = spawnSync(process.execPath, [scannerPath, missingPath], { encoding: 'utf8' })
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /Android APK boundary scan failed/)
})

test('APK scanner rejects truncated archives and CRC corruption', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-corrupt-')
  const validPath = join(directory, 'valid.apk')
  await writeZip(validPath, validApkEntries({ 'assets/public/marker.txt': 'CRC-MARKER-CONTENT' }))

  const validArchive = readFileSync(validPath)
  writeFileSync(join(directory, 'truncated.apk'), validArchive.subarray(0, validArchive.length - 12))
  await assert.rejects(scanApk(join(directory, 'truncated.apk')), /end of central directory|unexpected end|invalid/i)

  const corruptArchive = Buffer.from(validArchive)
  const markerOffset = corruptArchive.indexOf('CRC-MARKER-CONTENT')
  assert.ok(markerOffset >= 0)
  corruptArchive[markerOffset] ^= 0xff
  const corruptPath = join(directory, 'bad-crc.apk')
  writeFileSync(corruptPath, corruptArchive)
  await assert.rejects(scanApk(corruptPath), /CRC mismatch/)
})

test('APK scanner rejects encrypted and unsupported entries', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-flags-')
  const basePath = join(directory, 'base.apk')
  await writeZip(basePath, validApkEntries())

  const encrypted = readFileSync(basePath)
  mutateHeaderField(encrypted, 0x02014b50, 8, flags => flags | 1)
  mutateHeaderUInt32(encrypted, 0x02014b50, 20, size => size + 12)
  const encryptedPath = join(directory, 'encrypted.apk')
  writeFileSync(encryptedPath, encrypted)
  await assert.rejects(scanApk(encryptedPath), /Encrypted APK entry/)

  const unsupported = readFileSync(basePath)
  mutateHeaderField(unsupported, 0x04034b50, 8, () => 99)
  mutateHeaderField(unsupported, 0x02014b50, 10, () => 99)
  const unsupportedPath = join(directory, 'unsupported.apk')
  writeFileSync(unsupportedPath, unsupported)
  await assert.rejects(scanApk(unsupportedPath), /Unsupported APK compression method 99/)
})

test('APK scanner rejects empty and non-APK ZIP archives', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-structure-')
  const emptyPath = join(directory, 'empty.apk')
  await writeZip(emptyPath, {})
  await assert.rejects(scanApk(emptyPath), /contains no entries/)

  const zipPath = join(directory, 'ordinary.zip')
  await writeZip(zipPath, { 'readme.txt': 'ordinary archive' })
  await assert.rejects(scanApk(zipPath), /not an Android APK/)
})

test('APK scanner enforces per-entry and total uncompressed-size limits', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-limits-')
  const apkPath = join(directory, 'limited.apk')
  await writeZip(apkPath, validApkEntries())

  await assert.rejects(
    scanApk(apkPath, { maximumEntrySize: 16 }),
    /exceeds the 16-byte size limit/
  )
  await assert.rejects(
    scanApk(apkPath, { maximumTotalSize: 55 }),
    /exceed the 55-byte total size limit/
  )
})

test('APK scanner rejects expanded malicious packaged content and exits nonzero', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-malicious-')
  const apkPath = join(directory, 'malicious.apk')
  await writeZip(apkPath, validApkEntries({
    'assets/public/index.js': "import logger from 'electron-log'; import remote from '@electron/remote'; const electron = require('electron')",
    'assets/public/node.js': "import diagnostics from 'node:diagnostics_channel'; const fs = require('fs/promises')",
    'assets/public/config.json': '{"token":"packaged-token","cookie":"packaged-cookie","Authorization":"Bearer packaged-bearer","baseUrl":"https://music.zxbdwy.online/api"}',
    'assets/public/server.js': "const emulator = 'http://10.0.2.2:4174'; const lan = 'http://192.168.1.20:8080/api'",
    'assets/public/private-key.txt': '-----BEGIN OPENSSH PRIVATE KEY-----'
  }))

  const result = await scanApk(apkPath)
  assert.ok(result.findings.some(finding => finding.includes('Electron or Node import')))
  assert.ok(result.findings.some(finding => finding.includes('Electron package or runtime')))
  assert.ok(result.findings.some(finding => finding.includes('Node import or runtime')))
  assert.ok(result.findings.some(finding => finding.includes('development-server URL')))
  assert.ok(result.findings.some(finding => finding.includes('author-owned API default')))
  assert.ok(result.findings.some(finding => finding.includes('literal credential')))
  assert.ok(result.findings.some(finding => finding.includes('literal bearer or private key')))

  const cli = spawnSync(process.execPath, [scannerPath, apkPath], { encoding: 'utf8' })
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /Android APK boundary scan failed/)
})

test('APK scanner accepts a structurally valid clean fixture', async t => {
  const directory = temporaryDirectory(t, 'z-music-apk-clean-')
  const apkPath = join(directory, 'app-debug.apk')
  await writeZip(apkPath, validApkEntries({
    'resources.arsc': Buffer.from([0x02, 0x00, 0x0c, 0x00]),
    'assets/public/index.js': 'console.log("z-music-desktop")'
  }))

  assert.deepEqual(await scanApk(apkPath), { entriesScanned: 4, findings: [] })
  const cli = spawnSync(process.execPath, [scannerPath, apkPath], { encoding: 'utf8' })
  assert.equal(cli.status, 0)
  assert.match(cli.stdout, /boundary scan passed \(4 packaged entries inspected\)/)
})
