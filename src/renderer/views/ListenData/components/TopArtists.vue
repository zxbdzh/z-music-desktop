<template>
  <div v-if="data?.sections?.length" :class="$style.card">
    <div :class="$style.title">歌手排行</div>
    <div :class="$style.list">
      <button
        type="button"
        v-for="(item, index) in data.sections"
        :key="index"
        :class="$style.item"
        :aria-label="`查看歌手 ${item.artistName}`"
        :title="`查看歌手 ${item.artistName}`"
        @click="goArtist(item.artistId)"
      >
        <img :class="$style.avatar" :src="item.picUrl" :alt="item.artistName" />
        <div :class="$style.info">
          <span :class="$style.name" :title="item.artistName">{{ item.artistName }}</span>
          <div :class="$style.progress">
            <div
              :class="$style.progressFill"
              :style="{ width: getPercent(item.text) + '%' }"
            />
          </div>
        </div>
        <span :class="$style.count">{{ item.text }}</span>
        <svg-icon :class="$style.arrow" name="right" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'

export default {
  name: 'TopArtists',
  props: {
    data: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter()

    const maxCount = computed(() => {
      const sections = props.data?.sections || []
      if (!sections.length) return 1
      // 从 "194次" 这样的字符串中提取数字
      return Math.max(...sections.map(s => {
        const num = parseInt(s.text) || 0
        return num
      }), 1)
    })

    const getPercent = (text) => {
      const num = parseInt(text) || 0
      return Math.round((num / maxCount.value) * 100)
    }

    const goArtist = (artistId) => {
      if (!artistId) return
      router.push({ path: '/artist', query: { id: artistId, from: 'listen-data' } })
    }

    return {
      maxCount,
      getPercent,
      goArtist,
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
  gap: 12px;
}

.item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px;
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

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.name {
  font-size: 14px;
  color: var(--color-text, var(--color-font));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress {
  height: 4px;
  background: var(--color-canvas, var(--color-secondary-background));
  border-radius: 2px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-brand, var(--color-primary));
  border-radius: 2px;
}

.count {
  font-size: 12px;
  color: var(--color-text-muted, var(--color-secondary-text));
  flex-shrink: 0;
}

.arrow {
  color: var(--color-text-muted, var(--color-secondary-text));
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .item:hover {
    background: var(--color-surface-raised, var(--color-secondary-background));
  }
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition-duration: var(--motion-reduced, 140ms);
  }

  .item:active {
    transform: none;
  }
}
</style>
