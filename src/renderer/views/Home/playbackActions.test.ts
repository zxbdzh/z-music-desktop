import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  playMusicInfo: { musicInfo: null as LX.Music.MusicInfo | null },
  addTempPlayList: vi.fn(),
  play: vi.fn(async () => {}),
  playNext: vi.fn(async () => {}),
  togglePlay: vi.fn(),
}))

vi.mock('@renderer/store/player/state', () => ({
  playMusicInfo: mocks.playMusicInfo,
}))

vi.mock('@renderer/store/player/action', () => ({
  addTempPlayList: mocks.addTempPlayList,
}))

vi.mock('@renderer/core/player', () => ({
  play: mocks.play,
  playNext: mocks.playNext,
  togglePlay: mocks.togglePlay,
}))

import { continueCurrentPlayback, playRecentTrack } from './playbackActions'

const recentTrack = {
  listId: 'list-1',
  isTempPlay: false,
  musicInfo: {
    id: 'recent-1',
    name: 'Recent track',
    singer: 'Artist',
    source: 'kw',
    interval: '03:00',
    meta: {},
  } as LX.Music.MusicInfo,
} satisfies LX.Player.PlayMusicInfo

describe('Home playback actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.playMusicInfo.musicInfo = null
    mocks.addTempPlayList.mockImplementation(() => {
      if (!mocks.playMusicInfo.musicInfo) void mocks.playNext()
    })
  })

  it('continues playback without toggling an already playing track to pause', () => {
    continueCurrentPlayback()

    expect(mocks.play).toHaveBeenCalledTimes(1)
    expect(mocks.togglePlay).not.toHaveBeenCalled()
  })

  it('immediately switches to a recent track when another track is current', () => {
    mocks.playMusicInfo.musicInfo = { id: 'current-1' } as LX.Music.MusicInfo

    playRecentTrack(recentTrack)

    expect(mocks.addTempPlayList).toHaveBeenCalledWith([
      { listId: 'list-1', musicInfo: recentTrack.musicInfo, isTop: true },
    ])
    expect(mocks.playNext).toHaveBeenCalledTimes(1)
  })

  it('lets the queue action start a recent track when nothing is current', () => {
    playRecentTrack(recentTrack)

    expect(mocks.addTempPlayList).toHaveBeenCalledTimes(1)
    expect(mocks.playNext).toHaveBeenCalledTimes(1)
  })
})
