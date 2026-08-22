<template>
  <div v-if="data?.sections?.length" :class="$style.card">
    <div :class="$style.title">单曲排行</div>
    <div :class="$style.list">
      <button
        type="button"
        v-for="(item, index) in data.sections"
        :key="index"
        :class="$style.item"
        :aria-label="`播放歌曲 ${item.songName}`"
        :title="`播放歌曲 ${item.songName}`"
        @click="handlePlay(item, index)"
      >
        <img :class="$style.cover" :src="item.picUrl" :alt="item.songName" />
        <div :class="$style.info">
          <span :class="$style.name" :data-full="item.songName" :title="item.songName">{{ item.songName }}</span>
          <span :class="$style.count">{{ item.text }}</span>
        </div>
        <svg :class="$style.playIcon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M8 5v14l11-7z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'
import { toNewMusicInfo } from '@common/utils/tools'

export default {
  name: 'TopSongs',
  props: {
    data: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const handlePlay = async(item) => {
      if (!item.songId) return
      // 兼容有 artists 字段(旧API)和没有 artists 字段(新API)的情况
      let singerName = ''
      let singerId = ''
      let ar = []

      if (item.artists?.length) {
        singerName = item.artists.map((a) => a.artistName).join('、')
        singerId = item.artists[0]?.artistId ? String(item.artists[0].artistId) : ''
        ar = item.artists.map((a) => ({ id: String(a.artistId), name: a.artistName }))
      }

      const musicInfo = {
        songmid: String(item.songId),
        name: item.songName,
        singer: singerName,
        source: 'wy',
        interval: '',
        albumName: '',
        albumId: '',
        img: item.picUrl || '',
        types: [],
        _types: {},
        singerId,
        ar,
      }
      const formattedSongs = [toNewMusicInfo(musicInfo)]
      await setTempList('wy_topsong_' + item.songId, formattedSongs)
      void playList(LIST_IDS.TEMP, 0)
    }

    return {
      handlePlay,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.card {
  border: 1px solid var(--color-border, var(--color-primary-alpha-900));
  border-radius: @radius-medium;
  background: var(--color-surface, var(--color-main-background));
  padding: 16px;
  margin-bottom: 16px;
}

.title {
  font-size: 14px;
  color: var(--color-text-muted, var(--color-secondary-text));
  margin-bottom: 12px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 6px;
  border: 0;
  border-radius: @radius-medium;
  color: var(--color-text, var(--color-font));
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out, transform @motion-press @ease-out;

  &:active {
    transform: scale(.99);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: 2px;
  }
}

.cover {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.name {
  font-size: 14px;
  color: var(--color-text, var(--color-font));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  position: relative;
  cursor: pointer;
}

.count {
  font-size: 12px;
  color: var(--color-text-muted, var(--color-secondary-text));
}

.playIcon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-brand, var(--color-primary));
  color: var(--white);
  flex-shrink: 0;
  opacity: 1;
  transition: opacity @motion-press @ease-out, background-color @motion-press @ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .item:hover {
    background: var(--color-surface-raised, var(--color-secondary-background));
  }

  .playIcon {
    opacity: 0;
  }

  .name:hover::after {
    content: attr(data-full);
    position: absolute;
    left: 0;
    top: 100%;
    background: var(--color-text, var(--color-font));
    color: var(--color-surface, var(--white));
    padding: 4px 8px;
    border: 1px solid var(--color-border, var(--color-primary-alpha-900));
    border-radius: @radius-small;
    font-size: 12px;
    white-space: nowrap;
    z-index: 100;
    margin-top: 4px;
    box-shadow: var(--shadow-overlay);
  }

  .item:hover .playIcon,
  .item:focus-visible .playIcon {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .item,
  .playIcon {
    transition-duration: var(--motion-reduced, 140ms);
  }

  .item:active {
    transform: none;
  }
}
</style>
