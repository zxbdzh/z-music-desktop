import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

import { collectModuleSpecifiers, forbiddenModuleSpecifier, forbiddenPatterns } from './forbidden-patterns.mjs'

const androidRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultApkPath = resolve(androidRoot, 'android/app/build/outputs/apk/debug/app-debug.apk')
const endOfCentralDirectorySignature = 0x06054b50
const centralDirectorySignature = 0x02014b50
const localFileSignature = 0x04034b50
const maximumEntrySize = 128 * 1024 * 1024

function findEndOfCentralDirectory(archive) {
  const minimumOffset = Math.max(0, archive.length - 65_557)
  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === endOfCentralDirectorySignature) return offset
  }
  throw new Error('APK is not a valid ZIP archive: end-of-central-directory record is missing.')
}

export function readApkEntries(apkPath) {
  const archive = readFileSync(apkPath)
  const directoryEnd = findEndOfCentralDirectory(archive)
  const entryCount = archive.readUInt16LE(directoryEnd + 10)
  let directoryOffset = archive.readUInt32LE(directoryEnd + 16)
  const entries = []

  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(directoryOffset) !== centralDirectorySignature) {
      throw new Error(`APK central directory entry ${index} is invalid.`)
    }

    const flags = archive.readUInt16LE(directoryOffset + 8)
    const compressionMethod = archive.readUInt16LE(directoryOffset + 10)
    const compressedSize = archive.readUInt32LE(directoryOffset + 20)
    const uncompressedSize = archive.readUInt32LE(directoryOffset + 24)
    const fileNameLength = archive.readUInt16LE(directoryOffset + 28)
    const extraLength = archive.readUInt16LE(directoryOffset + 30)
    const commentLength = archive.readUInt16LE(directoryOffset + 32)
    const localOffset = archive.readUInt32LE(directoryOffset + 42)
    const name = archive.subarray(directoryOffset + 46, directoryOffset + 46 + fileNameLength).toString('utf8')

    if ((flags & 1) !== 0) throw new Error(`Encrypted APK entry cannot be inspected: ${name}`)
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new Error(`ZIP64 APK entry is not supported: ${name}`)
    }
    if (uncompressedSize > maximumEntrySize) throw new Error(`APK entry is too large to inspect: ${name}`)
    if (archive.readUInt32LE(localOffset) !== localFileSignature) throw new Error(`APK entry has an invalid local header: ${name}`)

    const localNameLength = archive.readUInt16LE(localOffset + 26)
    const localExtraLength = archive.readUInt16LE(localOffset + 28)
    const contentOffset = localOffset + 30 + localNameLength + localExtraLength
    const compressed = archive.subarray(contentOffset, contentOffset + compressedSize)
    let content
    if (compressionMethod === 0) content = compressed
    else if (compressionMethod === 8) content = inflateRawSync(compressed)
    else throw new Error(`Unsupported APK compression method ${compressionMethod} for ${name}`)

    if (content.length !== uncompressedSize) throw new Error(`APK entry size mismatch: ${name}`)
    entries.push({ name, content })
    directoryOffset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

export function scanApk(apkPath = defaultApkPath) {
  const findings = []
  const entries = readApkEntries(apkPath)
  for (const { name, content } of entries) {
    const searchableViews = [
      content.toString('latin1'),
      content.toString('utf16le'),
      content.subarray(1).toString('utf16le')
    ]
    const entryFindings = new Set()
    for (const searchableContent of searchableViews) {
      const forbiddenImports = collectModuleSpecifiers(searchableContent).filter(specifier => forbiddenModuleSpecifier.test(specifier))
      if (forbiddenImports.length > 0) entryFindings.add('Electron or Node import')
      for (const { name: patternName, pattern } of forbiddenPatterns) {
        if (pattern.test(searchableContent)) entryFindings.add(patternName)
      }
    }
    for (const finding of entryFindings) findings.push(`${name}: ${finding}`)
  }
  return { entriesScanned: entries.length, findings }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apkPath = resolve(process.argv[2] ?? defaultApkPath)
  try {
    const { entriesScanned, findings } = scanApk(apkPath)
    if (findings.length > 0) {
      console.error(`Android APK boundary scan failed:\n${findings.map(finding => `- ${finding}`).join('\n')}`)
      process.exitCode = 1
    } else {
      console.log(`Android APK boundary scan passed (${entriesScanned} packaged entries inspected).`)
    }
  } catch (error) {
    console.error(`Android APK boundary scan failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
