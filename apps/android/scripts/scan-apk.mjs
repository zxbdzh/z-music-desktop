import crc32 from 'buffer-crc32'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yauzl from 'yauzl'

import { collectModuleSpecifiers, forbiddenPatterns, isForbiddenModuleSpecifier } from './forbidden-patterns.mjs'

const androidRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultApkPath = resolve(androidRoot, 'android/app/build/outputs/apk/debug/app-debug.apk')
export const maximumEntrySize = 128 * 1024 * 1024
export const maximumTotalSize = 512 * 1024 * 1024

function openZip(apkPath) {
  return new Promise((resolveOpen, rejectOpen) => {
    yauzl.open(apkPath, {
      autoClose: true,
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true
    }, (error, zipfile) => {
      if (error) rejectOpen(error)
      else resolveOpen(zipfile)
    })
  })
}

function readEntry(zipfile, entry, entrySizeLimit) {
  return new Promise((resolveRead, rejectRead) => {
    zipfile.openReadStream(entry, (openError, stream) => {
      if (openError) {
        rejectRead(openError)
        return
      }

      const chunks = []
      let actualSize = 0
      let checksum
      let settled = false
      const rejectOnce = (error) => {
        if (settled) return
        settled = true
        rejectRead(error)
      }

      stream.on('data', chunk => {
        actualSize += chunk.length
        if (actualSize > entrySizeLimit) {
          stream.destroy(new Error(`APK entry exceeds the ${entrySizeLimit}-byte read limit: ${entry.fileName}`))
          return
        }
        checksum = crc32(chunk, checksum)
        chunks.push(chunk)
      })
      stream.once('error', rejectOnce)
      stream.once('end', () => {
        if (settled) return
        settled = true
        if (actualSize !== entry.uncompressedSize) {
          rejectRead(new Error(`APK entry size mismatch: ${entry.fileName}`))
          return
        }
        const actualCrc = checksum ? checksum.readUInt32BE(0) : crc32.unsigned(Buffer.alloc(0))
        if (actualCrc !== (entry.crc32 >>> 0)) {
          rejectRead(new Error(`APK entry CRC mismatch: ${entry.fileName}`))
          return
        }
        resolveRead(Buffer.concat(chunks, actualSize))
      })
    })
  })
}

function scanContent(entryName, content) {
  const searchableViews = [
    content.toString('latin1'),
    content.toString('utf16le'),
    content.subarray(1).toString('utf16le')
  ]
  const entryFindings = new Set()
  for (const searchableContent of searchableViews) {
    const forbiddenImports = collectModuleSpecifiers(searchableContent).filter(isForbiddenModuleSpecifier)
    if (forbiddenImports.length > 0) entryFindings.add('Electron or Node import')
    for (const { name, pattern } of forbiddenPatterns) {
      if (pattern.test(searchableContent)) entryFindings.add(name)
    }
  }
  return Array.from(entryFindings, finding => `${entryName}: ${finding}`)
}

function isAndroidBinaryXml(content) {
  return content.length >= 4 && content.subarray(0, 4).equals(Buffer.from([0x03, 0x00, 0x08, 0x00]))
}

function isDexFile(content) {
  return content.length >= 8 && /^dex\n\d{3}\0/.test(content.subarray(0, 8).toString('latin1'))
}

export async function scanApk(apkPath = defaultApkPath, limits = {}) {
  const entrySizeLimit = limits.maximumEntrySize ?? maximumEntrySize
  const totalSizeLimit = limits.maximumTotalSize ?? maximumTotalSize
  const zipfile = await openZip(apkPath)
  if (zipfile.entryCount === 0) {
    zipfile.close()
    throw new Error('APK archive contains no entries.')
  }

  return new Promise((resolveScan, rejectScan) => {
    const findings = []
    let entriesScanned = 0
    let totalReportedSize = 0
    let totalActualSize = 0
    let hasManifest = false
    let hasDex = false
    let settled = false

    const fail = (error) => {
      if (settled) return
      settled = true
      zipfile.close()
      rejectScan(error instanceof Error ? error : new Error(String(error)))
    }

    zipfile.once('error', fail)
    zipfile.on('entry', entry => {
      if (settled) return
      entriesScanned += 1
      totalReportedSize += entry.uncompressedSize

      if (entry.isEncrypted()) {
        fail(new Error(`Encrypted APK entry cannot be inspected: ${entry.fileName}`))
        return
      }
      if (![0, 8].includes(entry.compressionMethod)) {
        fail(new Error(`Unsupported APK compression method ${entry.compressionMethod}: ${entry.fileName}`))
        return
      }
      if (entry.uncompressedSize > entrySizeLimit) {
        fail(new Error(`APK entry exceeds the ${entrySizeLimit}-byte size limit: ${entry.fileName}`))
        return
      }
      if (totalReportedSize > totalSizeLimit) {
        fail(new Error(`APK entries exceed the ${totalSizeLimit}-byte total size limit.`))
        return
      }

      if (entry.fileName.endsWith('/')) {
        if (entry.compressedSize !== 0 || entry.uncompressedSize !== 0 || (entry.crc32 >>> 0) !== 0) {
          fail(new Error(`APK directory entry contains hidden data: ${entry.fileName}`))
          return
        }
        zipfile.readEntry()
        return
      }

      readEntry(zipfile, entry, entrySizeLimit).then(content => {
        totalActualSize += content.length
        if (totalActualSize > totalSizeLimit) {
          fail(new Error(`APK contents exceed the ${totalSizeLimit}-byte total read limit.`))
          return
        }
        if (entry.fileName === 'AndroidManifest.xml' && isAndroidBinaryXml(content)) hasManifest = true
        if (/^classes(?:\d+)?\.dex$/.test(entry.fileName) && isDexFile(content)) hasDex = true
        findings.push(...scanContent(entry.fileName, content))
        zipfile.readEntry()
      }, fail)
    })
    zipfile.once('end', () => {
      if (settled) return
      settled = true
      if (!hasManifest || !hasDex) {
        rejectScan(new Error('ZIP is not an Android APK: AndroidManifest.xml and classes*.dex are required.'))
        return
      }
      resolveScan({ entriesScanned, findings })
    })
    zipfile.readEntry()
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apkPath = resolve(process.argv[2] ?? defaultApkPath)
  try {
    const { entriesScanned, findings } = await scanApk(apkPath)
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
