import { createCipheriv, createDecipheriv } from 'crypto'
import { toMD5 } from '../utils'
import { httpFetch } from '../../request'
import { formatPlayTime } from '@common/utils'

const databaseCache: {
  data: any[] | null
  fetchedAt: number
  pending: Promise<any[]> | null
} = {
  data: null,
  fetchedAt: 0,
  pending: null,
}
const CACHE_DURATION = 3600000 // 1小时缓存

// Gitcode配置
export const GITCODE_CONFIG: { owner: string; repo: string; dbUrl: string } = {
  owner: 'ikun_0014', // Gitcode用户名
  repo: 'music', // 仓库名
  dbUrl: 'https://api.gitcode.com/api/v5/repos/ikun_0014/music/raw/audio_database.json',
}

/**
 * 加载音乐数据库
 */
export const loadDatabase = (forceReload: boolean = false): Promise<any[]> => {
  const now = Date.now()
  if (!forceReload && databaseCache.data && now - databaseCache.fetchedAt < CACHE_DURATION) {
    return Promise.resolve(databaseCache.data)
  }
  if (databaseCache.pending) return databaseCache.pending

  const load = async () => {
    try {
      const requestObj = httpFetch(GITCODE_CONFIG.dbUrl)
      const { body } = await requestObj.promise
      const data = typeof body === 'string' ? JSON.parse(body) : body
      databaseCache.data = data
      databaseCache.fetchedAt = now
      console.log(`成功加载 ${data.length} 首歌曲`)
      return data
    } catch (error) {
      console.error('加载数据库失败:', error)
      return []
    }
  }
  const pending = load().finally(() => {
    if (databaseCache.pending === pending) databaseCache.pending = null
  })

  databaseCache.pending = pending
  return pending
}

/**
 * 从文件名提取歌曲名
 */
export const extractNameFromFile = (filename: string): string => {
  if (!filename) return '未知歌曲'
  // 移除扩展名
  let name = filename.replace(/\.[^.]+$/, '')
  // 尝试提取歌曲名（处理常见格式：歌手 - 歌名）
  const match = name.match(/^(?:.*?[-–—]\s*)?(.+)$/)
  return match ? match[1].trim() : name
}

/**
 * 生成歌曲ID
 */
export const generateSongId = (relativePath: string): string => {
  // 使用相对路径的哈希作为唯一ID
  const hash = simpleHash(relativePath)
  return `gitcode_${hash}`
}

/**
 * 生成专辑ID
 */
export const generateAlbumId = (album: string): string => {
  if (!album) return ''
  return `album_${simpleHash(album)}`
}

/**
 * 简单哈希函数
 */
export const simpleHash = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash).toString(36)
}

/**
 * 获取歌曲时长
 */
export const getInterval = (item: any): string => {
  // 如果元数据中有时长信息，使用它
  if (item.duration) {
    return formatPlayTime(item.duration)
  }
  // 否则返回默认值
  return '00:00'
}

/**
 * 获取音质类型
 */
export const getTypes = (item: any): { type: string; size: string }[] => {
  const types = []
  const format = item.format?.toLowerCase()

  // 根据格式判断音质
  if (format === 'flac') {
    types.push({ type: 'flac', size: formatSize(item.filesize) })
  } else if (format === 'mp3') {
    types.push({ type: '320k', size: formatSize(item.filesize) })
  } else if (format === 'm4a' || format === 'mp4') {
    types.push({ type: '128k', size: formatSize(item.filesize) })
  } else {
    types.push({ type: '128k', size: formatSize(item.filesize) })
  }

  return types
}

/**
 * 获取音质类型（详细版）
 */
export const get_Types = (item: any): Record<string, { size: string }> => {
  const _types: Record<string, { size: string }> = {}
  const format = item.format?.toLowerCase()

  if (format === 'flac') {
    _types.flac = { size: formatSize(item.filesize) }
  } else if (format === 'mp3') {
    _types['320k'] = { size: formatSize(item.filesize) }
  } else {
    _types['128k'] = { size: formatSize(item.filesize) }
  }

  return _types
}

/**
 * 格式化文件大小
 */
export const formatSize = (bytes: number): string => {
  if (!bytes) return 'UNKNOWN'
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + sizes[i]
}

export const objStr2JSON = (str: string): any => {
  return JSON.parse(
    str.replace(/('(?=(,\s*')))|('(?=:))|((?<=([:,]\s*))')|((?<={)')|('(?=}))/g, '"')
  )
}

export const formatSinger = (rawData: string): string => rawData.replace(/&/g, '、')

export const matchToken = (headers: any): string | null => {
  try {
    return headers['set-cookie'][0].match(/kw_token=(\w+)/)[1]
  } catch (err) {
    return null
  }
}

const createAesEncrypt = (buffer: Buffer, mode: string, key: Buffer, iv: string | Buffer): Buffer => {
  const cipher = createCipheriv(mode, key, iv)
  return Buffer.concat([cipher.update(buffer), cipher.final()])
}

const createAesDecrypt = (buffer: Buffer, mode: string, key: Buffer, iv: string | Buffer): Buffer => {
  const cipher = createDecipheriv(mode, key, iv)
  return Buffer.concat([cipher.update(buffer), cipher.final()])
}

export const wbdCrypto = {
  aesMode: 'aes-128-ecb',
  aesKey: Buffer.from(
    [112, 87, 39, 61, 199, 250, 41, 191, 57, 68, 45, 114, 221, 94, 140, 228] as any,
    'binary'
  ),
  aesIv: '',
  appId: 'y67sprxhhpws',
  decodeData(base64Result: string): any {
    const data = Buffer.from(decodeURIComponent(base64Result), 'base64')
    return JSON.parse(createAesDecrypt(data, this.aesMode, this.aesKey, this.aesIv).toString())
  },
  createSign(data: string, time: number): string {
    const str = `${this.appId}${data}${time}`
    return toMD5(str).toUpperCase()
  },
  buildParam(jsonData: any): string {
    const data = Buffer.from(JSON.stringify(jsonData))
    const time = Date.now()

    const encodeData = createAesEncrypt(data, this.aesMode, this.aesKey, this.aesIv).toString(
      'base64'
    )
    const sign = this.createSign(encodeData, time)

    return `data=${encodeURIComponent(encodeData)}&time=${time}&appId=${this.appId}&sign=${sign}`
  },
}

/**
 * 构建下载URL
 */
export const buildDownloadUrl = (relativePath: string): string => {
  const encodedPath = encodeURIComponent(relativePath.replace(/\\/g, '/'))
  return `https://api.gitcode.com/api/v5/repos/${GITCODE_CONFIG.owner}/${GITCODE_CONFIG.repo}/raw/${encodedPath}`
}
