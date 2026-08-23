import { reactive, toRaw } from '@common/utils/vueTools'
import { createRetryablePromiseCache } from '@common/utils/retryablePromiseCache'
import {
  getUserSoundEffectConvolutionPresetList,
  getUserSoundEffectEQPresetList,
  saveUserSoundEffectConvolutionPresetList,
  saveUserSoundEffectEQPresetList,
} from '@renderer/utils/ipc'

const userEqPresetListCache = createRetryablePromiseCache(() => (
  getUserSoundEffectEQPresetList().then((list) => reactive(list))
))
const getMutableUserEQPresetList = (): Promise<LX.SoundEffect.EQPreset[]> => userEqPresetListCache.get()

export const getUserEQPresetList = getMutableUserEQPresetList

export const saveUserEQPreset = async (preset: LX.SoundEffect.EQPreset) => {
  const list = await getMutableUserEQPresetList()
  const target = list.find((item) => item.id == preset.id)
  if (target) Object.assign(target, preset)
  else list.push(preset)
  saveUserSoundEffectEQPresetList(toRaw(list))
}

export const removeUserEQPreset = async (id: string) => {
  const list = await getMutableUserEQPresetList()
  const index = list.findIndex((item) => item.id == id)
  if (index < 0) return
  list.splice(index, 1)
  saveUserSoundEffectEQPresetList(toRaw(list))
}

const userConvolutionPresetListCache = createRetryablePromiseCache(() => (
  getUserSoundEffectConvolutionPresetList().then((list) => reactive(list))
))
const getMutableUserConvolutionPresetList = (): Promise<LX.SoundEffect.ConvolutionPreset[]> => (
  userConvolutionPresetListCache.get()
)

export const getUserConvolutionPresetList = getMutableUserConvolutionPresetList

export const saveUserConvolutionPreset = async (preset: LX.SoundEffect.ConvolutionPreset) => {
  const list = await getMutableUserConvolutionPresetList()
  const target = list.find((item) => item.id == preset.id)
  if (target) Object.assign(target, preset)
  else list.push(preset)
  saveUserSoundEffectConvolutionPresetList(toRaw(list))
}

export const removeUserConvolutionPreset = async (id: string) => {
  const list = await getMutableUserConvolutionPresetList()
  const index = list.findIndex((item) => item.id == id)
  if (index < 0) return
  list.splice(index, 1)
  saveUserSoundEffectConvolutionPresetList(toRaw(list))
}
