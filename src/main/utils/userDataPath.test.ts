import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LEGACY_USER_DATA_DIR_NAME,
  USER_DATA_CONTENT_DIR_NAME,
  resolveCompatibleUserDataPath,
  resolvePortableRoot,
} from './userDataPath'

const appDataPath = path.join('C:', 'Users', 'test', 'AppData')
const currentUserDataPath = path.join(appDataPath, 'z-music-desktop')
const legacyUserDataPath = path.join(appDataPath, LEGACY_USER_DATA_DIR_NAME)

const existing = (...paths: string[]) => new Set(paths)

describe('resolvePortableRoot', () => {
  it('uses electron-builder portable executable directory when provided', () => {
    expect(
      resolvePortableRoot({
        executablePath: path.join('C:', 'Temp', 'app', 'z-music-desktop.exe'),
        portableExecutableDir: path.join('D:', 'Music'),
      })
    ).toBe(path.join('D:', 'Music'))
  })

  it('falls back to the installed executable directory', () => {
    expect(
      resolvePortableRoot({ executablePath: path.join('C:', 'Programs', 'z-music-desktop.exe') })
    ).toBe(path.join('C:', 'Programs'))
  })
})

describe('resolveCompatibleUserDataPath', () => {
  it('uses the legacy directory when upgrading an installation with existing data', () => {
    const files = existing(path.join(legacyUserDataPath, USER_DATA_CONTENT_DIR_NAME))

    expect(
      resolveCompatibleUserDataPath({
        appDataPath,
        currentUserDataPath,
        pathExists: (targetPath) => files.has(targetPath),
      })
    ).toBe(legacyUserDataPath)
  })

  it('keeps the new directory when it already contains data', () => {
    const files = existing(
      path.join(currentUserDataPath, USER_DATA_CONTENT_DIR_NAME),
      path.join(legacyUserDataPath, USER_DATA_CONTENT_DIR_NAME)
    )

    expect(
      resolveCompatibleUserDataPath({
        appDataPath,
        currentUserDataPath,
        pathExists: (targetPath) => files.has(targetPath),
      })
    ).toBe(currentUserDataPath)
  })

  it('uses the new directory for a fresh installation', () => {
    expect(
      resolveCompatibleUserDataPath({
        appDataPath,
        currentUserDataPath,
        pathExists: () => false,
      })
    ).toBe(currentUserDataPath)
  })

  it('uses legacy data when the new application directory exists without LxDatas', () => {
    const files = existing(
      currentUserDataPath,
      path.join(legacyUserDataPath, USER_DATA_CONTENT_DIR_NAME)
    )

    expect(
      resolveCompatibleUserDataPath({
        appDataPath,
        currentUserDataPath,
        pathExists: (targetPath) => files.has(targetPath),
      })
    ).toBe(legacyUserDataPath)
  })

  it('does not probe unrelated application directories', () => {
    const probes: string[] = []

    resolveCompatibleUserDataPath({
      appDataPath,
      currentUserDataPath,
      pathExists: (targetPath) => {
        probes.push(targetPath)
        return false
      },
    })

    expect(probes).toEqual([
      path.join(currentUserDataPath, USER_DATA_CONTENT_DIR_NAME),
      path.join(legacyUserDataPath, USER_DATA_CONTENT_DIR_NAME),
    ])
  })
})
