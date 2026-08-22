<template>
  <div v-if="data" :class="$style.card" role="region" :aria-label="dataTitle">
    <div :class="$style.title">{{ dataTitle }}</div>
    <!-- 柱状图模式 (周视图) -->
    <div v-if="!isMonthView" :class="$style.chart" role="list" :aria-label="`${dataTitle}柱状图`">
      <div
        v-for="(item, index) in chartData"
        :key="index"
        :class="$style.barItem"
        role="listitem"
        :aria-label="`${item.day}：${item.time || '无'}`"
      >
        <div :class="$style.barWrapper">
          <div
            :class="[$style.bar, { [$style.top]: item.isTop, [$style.active]: item.duration > 0, [$style.empty]: item.duration === 0 }]"
            :style="{ height: item.height + '%' }"
          >
            <span v-if="item.duration > 0" :class="$style.barLabel">{{ item.time }}</span>
          </div>
        </div>
        <span :class="$style.dayLabel">{{ item.day }}</span>
      </div>
    </div>
    <!-- 热力图模式 (月视图) -->
    <div v-else :class="$style.heatmap" role="list" :aria-label="`${dataTitle}热力图`">
      <div :class="$style.heatmapGrid">
        <div
          v-for="(item, index) in heatmapData"
          :key="index"
          :class="[$style.heatmapCell, { [$style.empty]: item.duration === 0 }]"
          :style="{ backgroundColor: getHeatColor(item.duration) }"
          :title="`${item.dateStr}: ${item.time || '无'}`"
          role="listitem"
          :aria-label="`${item.dateStr}：${item.time || '无'}`"
        >
          <span v-if="item.duration > 0" :class="$style.heatmapLabel">{{ item.dayStr }}</span>
        </div>
      </div>
      <div :class="$style.heatmapLegend">
        <span :class="$style.legendLabel">少</span>
        <div :class="$style.legendGradient"></div>
        <span :class="$style.legendLabel">多</span>
      </div>
    </div>
    <div v-if="data.listenDays" :class="$style.footer">
      <span>已听 {{ data.listenDays }}/{{ periodDayCount }} 天</span>
    </div>
  </div>
</template>

<script>
import { computed } from '@common/utils/vueTools'

export default {
  name: 'ListenTimeChart',
  props: {
    data: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const dataTitle = computed(() => '每日听歌时长')

    const durationDetails = computed(() => props.data?.durationDetails || [])

    const isMonthView = computed(() => {
      return durationDetails.value.length > 14
    })

    const chartData = computed(() => {
      const details = durationDetails.value
      if (!details.length) return []

      const maxDuration = Math.max(...details.map(d => Number(d.duration) || 0), 1)
      const dayLabels = ['日', '一', '二', '三', '四', '五', '六']

      return details.map((item, index) => {
        const date = new Date(item.period)
        const day = dayLabels[date.getDay()]
        const duration = Number(item.duration) || 0
        const height = (duration / maxDuration) * 100
        const hours = Math.floor(duration / 60)
        const mins = duration % 60
        const time = hours > 0 ? `${hours}小时${mins}分` : (mins > 0 ? `${mins}分` : '')

        return {
          day,
          duration,
          height,
          time,
          isTop: index === details.length - 1,
        }
      })
    })

    const heatmapData = computed(() => {
      const details = durationDetails.value
      if (!details.length) return []

      const dayLabels = ['日', '一', '二', '三', '四', '五', '六']

      return details.map((item) => {
        const date = new Date(item.period)
        const duration = Number(item.duration) || 0
        const hours = Math.floor(duration / 60)
        const mins = duration % 60
        const time = hours > 0 ? `${hours}小时${mins}分` : (mins > 0 ? `${mins}分` : '')

        return {
          day: date.getDate(),
          dayStr: dayLabels[date.getDay()],
          dateStr: `${date.getMonth() + 1}月${date.getDate()}日`,
          month: date.getMonth(),
          duration,
          time,
        }
      })
    })

    const maxDuration = computed(() => {
      const details = durationDetails.value
      return Math.max(...details.map(d => Number(d.duration) || 0), 1)
    })

    const periodDayCount = computed(() => {
      return isMonthView.value ? durationDetails.value.length : 7
    })

    const getHeatColor = (duration) => {
      if (duration <= 0) return 'var(--color-canvas, var(--color-surface))'
      const ratio = Math.min(duration / maxDuration.value, 1)
      const intensity = Math.round(ratio * 100)
      return `color-mix(in srgb, var(--color-brand, var(--color-primary)) ${intensity}%, var(--color-canvas, var(--color-surface)))`
    }

    return {
      dataTitle,
      chartData,
      heatmapData,
      isMonthView,
      periodDayCount,
      getHeatColor,
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
  margin-bottom: 16px;
}

.chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  gap: 8px;
}

.barItem {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.barWrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: var(--color-canvas, var(--color-secondary-background));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;

  &.top,
  &.active {
    background: var(--color-brand, var(--color-primary));
  }

  &.empty {
    background: transparent;
  }
}

.barLabel {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--color-brand, var(--color-primary));
  white-space: nowrap;
}

.dayLabel {
  font-size: 10px;
  color: var(--color-text-muted, var(--color-secondary-text));
  margin-top: 6px;
}

.footer {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted, var(--color-secondary-text));
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border, var(--color-primary-alpha-900));
}

.heatmap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.heatmapGrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.heatmapCell {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  cursor: default;
  transition: transform @motion-press @ease-out;

  &.empty {
    background: var(--color-canvas, var(--color-secondary-background));
  }
}

.heatmapLabel {
  font-size: 10px;
  color: var(--white);
  font-weight: bold;
}

.heatmapLegend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.legendLabel {
  font-size: 11px;
  color: var(--color-text-muted, var(--color-secondary-text));
}

.legendGradient {
  width: 100px;
  height: 10px;
  border-radius: @radius-small;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-brand, var(--color-primary)) 12%, var(--color-canvas, var(--color-surface))),
    var(--color-brand, var(--color-primary))
  );
}

@media (hover: hover) and (pointer: fine) {
  .heatmapCell:hover {
    transform: scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .heatmapCell {
    transition-duration: var(--motion-reduced, 140ms);
  }

  .heatmapCell:hover {
    transform: none;
  }
}
</style>
