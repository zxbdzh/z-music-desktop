<template>
  <div v-if="friendItems?.length" :class="$style.card">
    <div :class="$style.title">好友在听</div>
    <div :class="$style.list">
      <div
        v-for="(item, index) in friendItems"
        :key="index"
        :class="$style.item"
      >
        <img :class="$style.avatar" :src="item.userAvatar" :alt="item.username" />
        <img :class="$style.songCover" :src="item.songPicUrl" :alt="item.songName" />
        <div :class="$style.info">
          <span :class="$style.username">{{ item.username }}</span>
          <span :class="$style.song" :data-full="item.songName" :title="item.songName">{{ item.songName }}</span>
          <span v-if="item.artistName" :class="$style.artist">{{ item.artistName }}</span>
        </div>
        <span v-if="item.playCount" :class="$style.playCount">{{ item.playCount }}次</span>
        <button
          type="button"
          :class="$style.playBtn"
          :aria-label="`播放歌曲 ${item.songName}`"
          :title="`播放歌曲 ${item.songName}`"
          @click.stop="handlePlay(item)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'
import { toNewMusicInfo } from '@common/utils/tools'

export default {
  name: 'FriendsActivity',
  props: {
    data: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    // 兼容旧API(friendsListenWeekBlock.items)和新API(weekFriendsListenBlock.friendListenRecords)
    const friendItems = computed(() => {
      if (!props.data) return []
      if (props.data.items?.length) return props.data.items
      if (props.data.friendListenRecords?.length) return props.data.friendListenRecords
      return []
    })

    const handlePlay = async(item) => {
      if (!item.songId) return
      const musicInfo = {
        songmid: String(item.songId),
        name: item.songName,
        singer: item.artistName || '',
        source: 'wy',
        interval: '',
        albumName: item.albumName || '',
        albumId: item.albumId ? String(item.albumId) : '',
        img: item.songPicUrl || '',
        types: [],
        _types: {},
        singerId: item.artistId ? String(item.artistId) : '',
        ar: item.artistId ? [{ id: String(item.artistId), name: item.artistName || '' }] : [],
      }
      const formattedSongs = [toNewMusicInfo(musicInfo)]
      await setTempList('wy_friend_' + item.songId, formattedSongs)
      void playList(LIST_IDS.TEMP, 0)
    }

    return {
      friendItems,
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
  gap: 10px;
  padding: 6px;
  border-radius: @radius-medium;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.songCover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.username {
  font-size: 13px;
  color: var(--color-text, var(--color-font));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song {
  font-size: 12px;
  color: var(--color-text-muted, var(--color-secondary-text));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  cursor: pointer;

}

.artist {
  font-size: 11px;
  color: var(--color-text-muted, var(--color-secondary-text));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playCount {
  font-size: 12px;
  color: var(--color-text-muted, var(--color-secondary-text));
  flex-shrink: 0;
}

.playBtn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  padding: 0;
  background: var(--color-brand, var(--color-primary));
  color: var(--white);
  font: inherit;
  cursor: pointer;
  opacity: 1;
  transition: opacity @motion-press @ease-out, background-color @motion-press @ease-out, transform @motion-press @ease-out;

  &:active {
    transform: scale(.94);
  }

  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: 2px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .item:hover {
    background: var(--color-surface-raised, var(--color-secondary-background));
  }

  .song:hover::after {
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

  .playBtn {
    opacity: 0;
  }

  .item:hover .playBtn,
  .playBtn:focus-visible {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .playBtn {
    transition-duration: var(--motion-reduced, 140ms);
  }

  .playBtn:active {
    transform: none;
  }
}
</style>
