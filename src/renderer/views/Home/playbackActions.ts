import { play, playNext } from '@renderer/core/player'
import { addTempPlayList } from '@renderer/store/player/action'
import { playMusicInfo } from '@renderer/store/player/state'

export const continueCurrentPlayback = () => {
  void play()
}

export const playRecentTrack = (item: LX.Player.PlayMusicInfo | null | undefined) => {
  if (!item?.musicInfo) return
  const hasCurrentTrack = Boolean(playMusicInfo.musicInfo)
  addTempPlayList([{ listId: item.listId, musicInfo: item.musicInfo, isTop: true }])
  if (hasCurrentTrack) void playNext()
}
