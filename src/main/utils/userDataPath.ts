import path from 'node:path'
import { existsSync } from 'node:fs'

export const LEGACY_USER_DATA_DIR_NAME = 'ikun-music-desktop'
export const USER_DATA_CONTENT_DIR_NAME = 'LxDatas'

export interface UserDataPathOptions {
  appDataPath: string
  currentUserDataPath: string
  pathExists?: (targetPath: string) => boolean
}

/** Keep existing installations on their legacy directory until a new one has data. */
export const resolveCompatibleUserDataPath = ({
  appDataPath,
  currentUserDataPath,
  pathExists = existsSync,
}: UserDataPathOptions): string => {
  const legacyUserDataPath = path.join(appDataPath, LEGACY_USER_DATA_DIR_NAME)
  if (path.resolve(legacyUserDataPath) === path.resolve(currentUserDataPath)) return currentUserDataPath

  const currentDataPath = path.join(currentUserDataPath, USER_DATA_CONTENT_DIR_NAME)
  const legacyDataPath = path.join(legacyUserDataPath, USER_DATA_CONTENT_DIR_NAME)
  if (!pathExists(currentDataPath) && pathExists(legacyDataPath)) return legacyUserDataPath

  return currentUserDataPath
}
