import {
  saveListPositionInfo as saveListPositionInfoFromData,
  getListPositionInfo as getListPositionInfoFromData,
  saveListPrevSelectId as saveListPrevSelectIdFromData,
  getListPrevSelectId as getListPrevSelectIdFromData,
  saveListUpdateInfo as saveListUpdateInfoFromData,
  getListUpdateInfo as getListUpdateInfoFromData,
  saveSearchSetting as saveSearchSettingFromData,
  getSearchSetting as getSearchSettingFromData,
  saveSongListSetting as saveSongListSettingFromData,
  getSongListSetting as getSongListSettingFromData,
  saveLeaderboardSetting as saveLeaderboardSettingFromData,
  getLeaderboardSetting as getLeaderboardSettingFromData,
  saveViewPrevState as saveViewPrevStateFromData,
} from '@renderer/utils/ipc'
import { throttle } from '@common/utils'
import { type DEFAULT_SETTING, LIST_IDS } from '@common/constants'
import { dateFormat } from './index'
import { setUpdateTime } from '@renderer/store/list/action'
import { createRetryablePromiseCache } from '@common/utils/retryablePromiseCache'

const listPositionCache = createRetryablePromiseCache(() => (
  getListPositionInfoFromData().then((state) => state ?? {})
))
const listPrevSelectIdCache = createRetryablePromiseCache(() => (
  getListPrevSelectIdFromData().then((id) => id ?? LIST_IDS.DEFAULT)
))
const listUpdateInfoCache = createRetryablePromiseCache(() => (
  getListUpdateInfoFromData().then((state) => {
    const value = state ?? {}
    for (const [id, info] of Object.entries(value)) {
      setUpdateTime(id, info.updateTime ? dateFormat(info.updateTime) : '')
    }
    return value
  })
))
const searchSettingCache = createRetryablePromiseCache(getSearchSettingFromData)
const songListSettingCache = createRetryablePromiseCache(getSongListSettingFromData)
const leaderboardSettingCache = createRetryablePromiseCache(getLeaderboardSettingFromData)

const saveListPositionThrottle = throttle((state: LX.List.ListPositionInfo) => {
  saveListPositionInfoFromData(state)
}, 1000)
const saveSearchSettingThrottle = throttle((state: (typeof DEFAULT_SETTING)['search']) => {
  saveSearchSettingFromData(state)
}, 1000)
const saveSongListSettingThrottle = throttle((state: (typeof DEFAULT_SETTING)['songList']) => {
  saveSongListSettingFromData(state)
}, 1000)
const saveLeaderboardSettingThrottle = throttle((state: (typeof DEFAULT_SETTING)['leaderboard']) => {
  saveLeaderboardSettingFromData(state)
}, 1000)
const saveViewPrevStateThrottle = throttle((state) => {
  saveViewPrevStateFromData(state)
}, 1000)

const getListPositionState = () => listPositionCache.get()
export const getListPosition = async (id: string): Promise<number> => {
  const state = await getListPositionState()
  return state[id] ?? 0
}
export const setListPosition = async (id: string, position?: number) => {
  const state = await getListPositionState()
  state[id] = position ?? 0
  saveListPositionThrottle(state)
}
export const removeListPosition = async (id: string) => {
  const state = await getListPositionState()
  if (state[id] == null) return
  delete state[id]
  saveListPositionThrottle(state)
}
export const overwriteListPosition = async (ids: string[]) => {
  const state = await getListPositionState()
  const removedIds = []
  for (const id of Object.keys(state)) {
    if (ids.includes(id)) continue
    removedIds.push(id)
  }
  for (const id of removedIds) delete state[id]
  saveListPositionThrottle(state)
}

const saveListPrevSelectIdThrottle = throttle((id: string) => {
  saveListPrevSelectIdFromData(id)
}, 200)
export const getListPrevSelectId = () => listPrevSelectIdCache.get()
export const saveListPrevSelectId = (id: string) => {
  listPrevSelectIdCache.set(id)
  saveListPrevSelectIdThrottle(id)
}

const saveListUpdateInfo = throttle((state: LX.List.ListUpdateInfo) => {
  saveListUpdateInfoFromData(state)
}, 1000)

const getListUpdateInfoState = () => listUpdateInfoCache.get()
export const getListUpdateInfo = getListUpdateInfoState
export const setListUpdateInfo = async (info: LX.List.ListUpdateInfo) => {
  listUpdateInfoCache.set(info)
  saveListUpdateInfo(info)
}
export const setListAutoUpdate = async (id: string, enable: boolean) => {
  const state = await getListUpdateInfoState()
  const targetInfo = state[id] ?? { updateTime: 0, isAutoUpdate: false }
  targetInfo.isAutoUpdate = enable
  state[id] = targetInfo
  saveListUpdateInfo(state)
}
export const setListUpdateTime = async (id: string, time: number) => {
  const state = await getListUpdateInfoState()
  const targetInfo = state[id] ?? { updateTime: 0, isAutoUpdate: false }
  targetInfo.updateTime = time
  state[id] = targetInfo
  saveListUpdateInfo(state)
}
export const removeListUpdateInfo = async (id: string) => {
  const state = await getListUpdateInfoState()
  if (state[id] == null) return
  delete state[id]
  saveListUpdateInfo(state)
}
export const overwriteListUpdateInfo = async (ids: string[]) => {
  const state = await getListUpdateInfoState()
  const removedIds = []
  for (const id of Object.keys(state)) {
    if (ids.includes(id)) continue
    removedIds.push(id)
  }
  for (const id of removedIds) delete state[id]
  saveListUpdateInfo(state)
}

const getSearchSettingState = () => searchSettingCache.get()
export const getSearchSetting = async () => ({ ...await getSearchSettingState() })
export const setSearchSetting = async (setting: Partial<(typeof DEFAULT_SETTING)['search']>) => {
  const state = await getSearchSettingState()
  let requiredSave = false
  if (setting.source && state.source != setting.source) requiredSave = true
  if (setting.type && state.type != setting.type) requiredSave = true
  if (setting.temp_source && state.temp_source != setting.temp_source) requiredSave = true

  if (!requiredSave) return
  Object.assign(state, setting)
  saveSearchSettingThrottle(state)
}

const getSongListSettingState = () => songListSettingCache.get()
export const getSongListSetting = async () => ({ ...await getSongListSettingState() })
export const setSongListSetting = async (
  setting: Partial<(typeof DEFAULT_SETTING)['songList']>
) => {
  const state = await getSongListSettingState()
  Object.assign(state, setting)
  saveSongListSettingThrottle(state)
}

const getLeaderboardSettingState = () => leaderboardSettingCache.get()
export const getLeaderboardSetting = async () => ({ ...await getLeaderboardSettingState() })
export const setLeaderboardSetting = async (
  setting: Partial<(typeof DEFAULT_SETTING)['leaderboard']>
) => {
  const state = await getLeaderboardSettingState()
  Object.assign(state, setting)
  saveLeaderboardSettingThrottle(state)
}

export const saveViewPrevState = (state: (typeof DEFAULT_SETTING)['viewPrevState']) => {
  saveViewPrevStateThrottle(state)
}
