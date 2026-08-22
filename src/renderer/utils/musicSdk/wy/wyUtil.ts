/**
 * 网易云音乐工具类
 * 统一管理 API 调用，包括登录、打卡等
 */

// @ts-ignore
import {httpFetch} from '../../request'
import { normalizeWyApiBaseUrl, validateWyApiBaseUrl } from './wyApiBase'

export type WyApiConnectionStatus = 'reachable' | 'not_logged_in' | 'failed'

export interface WyApiConnectionResult {
  status: WyApiConnectionStatus
  statusCode?: number
  message?: string
}

const getStoredApiBaseUrl = (): string => {
  const setting = typeof window === 'undefined' ? undefined : window.lxData?.appSetting
  return normalizeWyApiBaseUrl(setting?.['wy.apiBaseUrl'])
}

export const getConfiguredApiBaseUrl = getStoredApiBaseUrl

/** Return the configured auxiliary-service URL, or throw a safe error. */
export const getApiBaseUrl = (override?: unknown): string => {
  const candidate = override === undefined ? getStoredApiBaseUrl() : override
  const result = validateWyApiBaseUrl(candidate)
  if (!result.valid) throw new Error('网易云第三方服务地址未配置')
  return result.value
}

const redactSensitive = (value: unknown): string => {
  const message = value instanceof Error ? value.message : String(value ?? '')
  return message
    .replace(/((?:cookie|music_u|nmtid|s_info)\s*[=:]\s*)[^&\s]+/gi, '$1[redacted]')
    .replace(/(cookie\s+)[^\s]+/gi, '$1[redacted]')
}

const logWyError = (label: string, error: unknown) => {
  console.error(label, redactSensitive(error))
}

const getBodyMessage = (body: any, fallback: string): string => {
  const message = typeof body?.message === 'string' ? body.message : ''
  return redactSensitive(message) || fallback
}

/** Test the configured service without sending the user's Cookie. */
export const testApiConnection = async (baseUrl?: string): Promise<WyApiConnectionResult> => {
  let url: string
  try {
    url = `${getApiBaseUrl(baseUrl)}/login/status`
  } catch (error) {
    return {status: 'failed', message: redactSensitive(error)}
  }

  try {
    const response: any = httpFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const {body, statusCode} = await response.promise
    if (statusCode < 200 || statusCode >= 300) {
      return {
        status: 'failed',
        statusCode,
        message: `HTTP ${statusCode}`,
      }
    }

    const isLoggedIn = body?.data?.code === 0 || Boolean(body?.data?.account?.id || body?.profile?.userId)
    return {
      status: isLoggedIn ? 'reachable' : 'not_logged_in',
      statusCode,
    }
  } catch (error) {
    return {status: 'failed', message: redactSensitive(error)}
  }
}

// CSRF Token提取
const getCsrfToken = (cookie: string): string => {
  const match = cookie.match(/_csrf=([^(;|$)]+)/)
  return match ? match[1] : ''
}

// 发送手机验证码
const sendCaptcha = async (phone: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/captcha/sent`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `phone=${encodeURIComponent(phone)}`,
    })

    const {body, statusCode} = await response.promise

    if (statusCode === 200 && body.code === 200) {
      return {success: true, message: '验证码已发送'}
    }

    return {success: false, message: getBodyMessage(body, '发送验证码失败')}
  } catch (err: any) {
    logWyError('Send captcha error:', err)
    return {success: false, message: redactSensitive(err?.message) || '网络错误'}
  }
}

// 验证码登录
const loginByCaptcha = async (phone: string, captcha: string): Promise<{
  success: boolean
  cookie: string
  uid: number
  message: string
}> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/login/cellphone`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `phone=${encodeURIComponent(phone)}&captcha=${encodeURIComponent(captcha)}`,
    })

    const {body, statusCode} = await response.promise

    if (statusCode === 200) {
      if (body.code === 200) {
        const cookie = body.cookie || ''
        const uid = body.profile?.userId || body.account?.id || 0
        return {success: true, cookie, uid, message: '登录成功'}
      } else if (body.code === 400) {
        return {success: false, cookie: '', uid: 0, message: getBodyMessage(body, '验证码错误')}
      }
    }

    return {success: false, cookie: '', uid: 0, message: getBodyMessage(body, '登录失败')}
  } catch (err: any) {
    logWyError('Login by captcha error:', err)
    return {success: false, cookie: '', uid: 0, message: redactSensitive(err?.message) || '网络错误'}
  }
}

// 听歌打卡
const scrobble = async (
  songId: string | number,
  sourceId: string | number | undefined,
  duration: number,
  cookie: string
): Promise<boolean> => {
  try {
    let url = `${getApiBaseUrl()}/scrobble?id=${songId}&time=${duration}`
    if (sourceId) {
      url += `&sourceid=${sourceId}`
    }

    const response: any = httpFetch(`${url}&cookie=${encodeURIComponent(cookie)}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const {body, statusCode} = await response.promise

    return statusCode === 200 && body.code === 200
  } catch (err: any) {
    logWyError('Scrobble error:', err)
    return false
  }
}

// 获取相似歌单
const getSimiPlaylist = async (songId: string | number): Promise<any[]> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/simi/playlist?id=${songId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const {body, statusCode} = await response.promise

    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取相似歌单失败`)
    }

    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取相似歌单失败'))
    }

    return (body.playlists || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      author: item.creator?.nickname || '',
      img: item.coverImgUrl || '',
      total: item.trackCount || 0,
      playCount: item.playCount || 0,
      description: item.description || '',
      tags: item.tags || [],
      createTime: item.createTime || 0,
      updateTime: item.updateTime || 0,
      subscribedCount: item.subscribedCount || 0,
    }))
  } catch (err: any) {
    logWyError('Get simi playlist error:', err)
    throw err
  }
}

// 获取相似歌曲
const getSimiSongs = async (songId: string | number): Promise<any[]> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/simi/song?id=${songId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const {body, statusCode} = await response.promise

    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取相似歌曲失败`)
    }

    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取相似歌曲失败'))
    }

    // 格式化返回数据
    const getAlbum = (song: any) => {
      if (song.al) return song.al
      if (song.album) return song.album
      return {id: 0, name: '', picUrl: ''}
    }
    return (body.songs || []).map((song: any) => ({
      id: song.id,
      name: song.name,
      ar: song.ar || song.artists || [],
      al: getAlbum(song),
      dt: song.dt || song.duration || 0,
      fee: song.fee || 0,
    }))
  } catch (err: any) {
    logWyError('Get simi songs error:', err)
    throw err
  }
}

// 获取歌手详情
interface ArtistInfo {
  videoCount: number
  artist: {
    id: number
    name: string
    cover: string
    avatar: string
    briefDesc: string
    albumSize: number
    musicSize: number
    mvSize: number
    transNames: string[]
    alias: string[]
    identities: string[]
    identifyTag: string[]
  }
  user: any
}

const getArtistInfo = async (artistId: string | number): Promise<ArtistInfo> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/artist/detail?id=${artistId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取歌手详情失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取歌手详情失败'))
    }
    return body.data
  } catch (err: any) {
    logWyError('Get artist info error:', err)
    throw err
  }
}

// 获取歌手全部/热门歌曲
const getArtistSongs = async (artistId: string | number, order = 'hot', limit = 50, offset = 0): Promise<{ songs: any[]; total: number }> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/artist/songs?id=${artistId}&order=${order}&limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取歌手歌曲失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取歌手歌曲失败'))
    }
    return { songs: body.songs || [], total: body.total || 0 }
  } catch (err: any) {
    logWyError('Get artist songs error:', err)
    throw err
  }
}

// 获取每日推荐歌曲
const getDailySongs = async (cookie: string): Promise<any[]> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/recommend/songs?cookie=${encodeURIComponent(cookie)}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const {body, statusCode} = await response.promise

    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取每日推荐失败`)
    }

    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取每日推荐失败'))
    }

    // 格式化返回数据
    const getAlbum = (song: any) => {
      if (song.al) return song.al
      if (song.album) return song.album
      return {id: 0, name: '', picUrl: ''}
    }
    return (body.data.dailySongs || []).map((song: any) => ({
      id: song.id,
      name: song.name,
      ar: song.ar || song.artists || [],
      al: getAlbum(song),
      dt: song.dt || song.duration || 0,
      fee: song.fee || 0,
    }))
  } catch (err: any) {
    logWyError('Get daily songs error:', err)
    throw err
  }
}

// 验证 Cookie 是否有效
const verifyCookie = async (cookie: string): Promise<{ valid: boolean; message?: string }> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/login/status?cookie=${encodeURIComponent(cookie)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const {body, statusCode} = await response.promise
    if (statusCode === 200 && body.data?.code === 0) {
      return {valid: true}
    }
    return {valid: false, message: getBodyMessage(body, 'Cookie无效')}
  } catch (err: any) {
    logWyError('Verify cookie error:', err)
    return {valid: false, message: redactSensitive(err?.message) || '验证失败'}
  }
}

// 获取用户歌单列表
interface UserPlaylist {
  id: number
  name: string
  coverImgUrl: string
  trackCount: number
  creatorNickname: string
}

const getUserPlaylist = async (cookie: string, uid: number): Promise<UserPlaylist[]> => {
  try {
    const response: any = httpFetch(
      `${getApiBaseUrl()}/user/playlist?uid=${uid}&cookie=${encodeURIComponent(cookie)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    )
    const {body, statusCode} = await response.promise
    if (statusCode !== 200 || body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取用户歌单失败'))
    }
    return (body.playlist || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      coverImgUrl: item.coverImgUrl,
      trackCount: item.trackCount,
      creatorNickname: item.creator?.nickname || '',
    }))
  } catch (err: any) {
    logWyError('Get user playlist error:', err)
    throw err
  }
}

// 获取用户uid
const getUid = async (cookie: string): Promise<number> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/login/status?cookie=${encodeURIComponent(cookie)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const {body, statusCode} = await response.promise
    if (statusCode === 200) {
      // data.code == 0 表示登录有效，!= 0 表示登录失效
      if (body.data?.account.status !== 0) {
        console.warn('[getUid] 登录已失效:', body.data?.code)
        return 0
      }
      return body.data.account?.id || body.data.profile?.userId || 0
    }
    return 0
  } catch (err: any) {
    logWyError('Get uid error:', err)
    return 0
  }
}

// 喜欢/取消喜欢歌曲
const likeSong = async (
  songId: string | number,
  uid: string | number,
  like: boolean,
  cookie: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const t = Date.now()
    const response: any = httpFetch(
      `${getApiBaseUrl()}/song/like?id=${songId}&uid=${uid}&like=${like}&cookie=${encodeURIComponent(cookie)}&t=${t}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cache-Control': 'no-cache',
        },
      }
    )
    const {body, statusCode} = await response.promise
    if (statusCode === 200 && body.code === 200) {
      return {success: true, message: 'success'}
    }
    return {success: false, message: getBodyMessage(body, '操作失败')}
  } catch (err: any) {
    logWyError('Like song error:', err)
    return {success: false, message: redactSensitive(err?.message) || '网络错误'}
  }
}

// 检查歌曲是否已喜爱（不使用缓存）
const checkIsLiked = async (
  ids: (string | number)[],
  cookie: string
): Promise<{ success: boolean; likedIds: Set<string | number>; message: string }> => {
  try {
    const idsStr = JSON.stringify(ids)  // [123] -> "[123]"
    const t = Date.now()
    const response: any = httpFetch(`${getApiBaseUrl()}/song/like/check?ids=${idsStr}&cookie=${encodeURIComponent(cookie)}&t=${t}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cache-Control': 'no-cache',
      },
    })
    const {body, statusCode} = await response.promise
    if (statusCode === 200 && body.code === 200) {
      return {success: true, likedIds: new Set(body.ids || []), message: 'success'}
    }
    return {success: false, likedIds: new Set(), message: getBodyMessage(body, '查询失败')}
  } catch (err: any) {
    logWyError('Check is liked error:', err)
    return {success: false, likedIds: new Set(), message: redactSensitive(err?.message) || '网络错误'}
  }
}

// 每日签到
const dailySignin = async (cookie: string, type: number = 1): Promise<{ success: boolean; point?: number; message: string }> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/daily_signin?type=${type}&cookie=${encodeURIComponent(cookie)}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const {body, statusCode} = await response.promise
    if (statusCode === 200) {
      if (body.code === 200) {
        return {success: true, point: body.point, message: '签到成功'}
      } else if (body.code === -2) {
        return {success: false, message: '重复签到'}
      }
    }
    return {success: false, message: getBodyMessage(body, '签到失败')}
  } catch (err: any) {
    logWyError('Daily signin error:', err)
    return {success: false, message: redactSensitive(err?.message) || '签到失败'}
  }
}

// 搜索歌手
interface SearchArtistResult {
  artistId: number
  artistName: string
  artistAvatarPicUrl: string
}

const searchArtist = async (keyword: string, limit = 5): Promise<SearchArtistResult[]> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/ugc/artist/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200 || body.code !== 200) {
      return []
    }
    return (body.data?.list || []).map((item: any) => ({
      artistId: item.artistId,
      artistName: item.artistName,
      artistAvatarPicUrl: item.artistAvatarPicUrl || '',
    }))
  } catch (err: any) {
    logWyError('Search artist error:', err)
    return []
  }
}

// 获取专辑详情
interface AlbumInfo {
  id: number
  name: string
  picUrl: string
  artist: {
    id: number
    name: string
    picUrl: string
  }
  publishTime: number
  size: number
  description: string
  briefDesc: string
}

const getAlbumDetail = async (albumId: string | number): Promise<{ album: AlbumInfo; songs: any[] }> => {
  try {
    const response: any = httpFetch(`${getApiBaseUrl()}/album?id=${albumId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200 || body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取专辑详情失败'))
    }
    return {
      album: body.album,
      songs: body.songs || [],
    }
  } catch (err: any) {
    logWyError('Get album detail error:', err)
    throw err
  }
}

// 听歌报告
interface ListenDataReport {
  code: number
  data: {
    type: string
    startTime: number
    endTime: number
    listenTimeBlock?: any
    listenTimeDistributionBlock?: any
    wallpaperBlock?: any
    topSongBlock?: any
    topArtistBlock?: any
    topStyleBlock?: any
    topAgeBlock?: any
    topLanguageBlock?: any
    vipBlock?: any
    djListenDataBlock?: any
    friendsListenWeekBlock?: any
    friendsKeywordWeekBlock?: any
  }
  message: string
}

const getListenDataReport = async (type: 'week' | 'month' | 'year', cookie: string, endTime?: number): Promise<ListenDataReport['data']> => {
  try {
    let url = `${getApiBaseUrl()}/listen/data/report?type=${type}&cookie=${encodeURIComponent(cookie)}`
    if (endTime) {
      url += `&endTime=${endTime}`
    }
    const response: any = httpFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取听歌报告失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取听歌报告失败'))
    }
    return body.data
  } catch (err: any) {
    logWyError('Get listen data report error:', err)
    throw err
  }
}

interface ListenDataYearReport {
  code: number
  data: {
    displayYear: number
    yearItems: Array<{
      year: number
      playNum: number
      playDuration: number
    }>
  }
  message: string
}

const getListenDataYearReport = async (cookie: string): Promise<ListenDataYearReport['data']> => {
  try {
    const url = `${getApiBaseUrl()}/listen/data/year/report?cookie=${encodeURIComponent(cookie)}`
    const response: any = httpFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取年报失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取年报失败'))
    }
    return body.data
  } catch (err: any) {
    logWyError('Get listen data year report error:', err)
    throw err
  }
}

const getListenDataRealtimeReport = async (type: 'week' | 'month' | 'year', cookie: string): Promise<any> => {
  try {
    const url = `${getApiBaseUrl()}/listen/data/realtime/report?type=${type}&cookie=${encodeURIComponent(cookie)}`
    const response: any = httpFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取实时听歌报告失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取实时听歌报告失败'))
    }
    return body.data
  } catch (err: any) {
    logWyError('Get listen data realtime report error:', err)
    throw err
  }
}

const getSongFirstListenInfo = async (songId: string | number, cookie: string): Promise<any> => {
  try {
    const url = `${getApiBaseUrl()}/music/first/listen/info?id=${songId}&cookie=${encodeURIComponent(cookie)}`
    const response: any = httpFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const { body, statusCode } = await response.promise
    if (statusCode !== 200) {
      throw new Error(`HTTP ${statusCode}: 获取歌曲回忆坐标失败`)
    }
    if (body.code !== 200) {
      throw new Error(getBodyMessage(body, '获取歌曲回忆坐标失败'))
    }
    return body.data
  } catch (err: any) {
    logWyError('Get song first listen info error:', err)
    throw err
  }
}

export default {
  getApiBaseUrl,
  getConfiguredApiBaseUrl,
  testApiConnection,
  getCsrfToken,
  sendCaptcha,
  loginByCaptcha,
  scrobble,
  getDailySongs,
  getSimiSongs,
  getSimiPlaylist,
  getUid,
  verifyCookie,
  getUserPlaylist,
  likeSong,
  checkIsLiked,
  dailySignin,
  getArtistInfo,
  getArtistSongs,
  searchArtist,
  getAlbumDetail,
  getListenDataReport,
  getListenDataYearReport,
  getListenDataRealtimeReport,
  getSongFirstListenInfo,
}
