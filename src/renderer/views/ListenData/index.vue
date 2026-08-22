<template>
  <div :class="$style.main">
    <header :class="$style.header">
      <button
        type="button"
        :class="$style.headerBack"
        :aria-label="$t('listen_data_back')"
        :title="$t('listen_data_back')"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><use xlink:href="#icon-back" /></svg>
      </button>
      <div :class="$style.headerTitle">
        <span :class="$style.eyebrow">Z / LISTENING</span>
        <h1>{{ $t('listen_data_title') }}</h1>
      </div>
      <span :class="$style.headerMark" aria-hidden="true">Z</span>
    </header>

    <nav :class="$style.periodNav" :aria-label="$t('listen_data_period_label')">
      <div :class="$style.tabs" role="tablist">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="$style.tabWrap"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :class="[$style.tab, { [$style.active]: activeTab === tab.id }]"
            @click="switchTab(tab.id)"
          >
            {{ $t(tab.label) }}
          </button>
        </div>
      </div>
      <div :class="$style.periodControls">
        <button
          type="button"
          :class="$style.periodButton"
          :aria-label="$t('listen_data_previous_period')"
          :title="$t('listen_data_previous_period')"
          :disabled="isOldestPeriod"
          @click="prevPeriod"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><use xlink:href="#icon-left" /></svg>
        </button>
        <span :class="$style.periodLabel">{{ periodLabel }}</span>
        <button
          type="button"
          :class="$style.periodButton"
          :aria-label="$t('listen_data_next_period')"
          :title="$t('listen_data_next_period')"
          :disabled="isCurrentPeriod"
          @click="nextPeriod"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><use xlink:href="#icon-right" /></svg>
        </button>
      </div>
    </nav>

    <main class="scroll" :class="$style.content">
      <div v-if="isLoading" :class="$style.loading" role="status" aria-live="polite">
        <span :class="$style.loadingMark" aria-hidden="true">Z</span>
        <span>{{ $t('loading') }}</span>
      </div>
      <template v-else-if="reportData">
        <ListenProgress :key="activeTab + '-' + periodOffset" :data="reportData" :type="activeTab" :periodOffset="periodOffset" />
        <template v-if="activeTab !== 'year'">
          <ListenTimeChart :data="reportData.listenTimeDistributionBlock" />
          <TopArtists :data="reportData.topArtistBlock" />
          <TopSongs :data="reportData.topSongBlock" />
          <SongWall :data="reportData.wallpaperBlock" />
          <StyleDistribution :data="reportData.topStyleBlock" />
          <AgeDistribution :data="reportData.topAgeBlock" />
          <LanguageDistribution :data="reportData.topLanguageBlock" />
          <FriendsActivity :data="reportData.friendsListenWeekBlock" />
        </template>
      </template>
      <section v-else :class="$style.empty" aria-live="polite">
        <div :class="$style.emptyMark" aria-hidden="true">Z</div>
        <p :class="$style.emptyEyebrow">{{ $t('listen_data_period_label') }}</p>
        <h2>{{ $t(emptyTitleKey) }}</h2>
        <p :class="$style.emptyDescription">{{ $t(emptyDescriptionKey) }}</p>
        <div :class="$style.emptyActions">
          <button v-if="needsSettings" type="button" :class="$style.primaryAction" @click="goToSettings">
            {{ $t('listen_data_open_settings') }}
          </button>
          <button v-else type="button" :class="$style.secondaryAction" @click="loadData">
            {{ $t('listen_data_retry') }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { ref, computed, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import wyUtil from '@renderer/utils/musicSdk/wy/wyUtil'
import { normalizeWyApiBaseUrl } from '@renderer/utils/musicSdk/wy/wyApiBase'
import ListenProgress from './components/ListenProgress.vue'
import ListenTimeChart from './components/ListenTimeChart.vue'
import TopArtists from './components/TopArtists.vue'
import TopSongs from './components/TopSongs.vue'
import SongWall from './components/SongWall.vue'
import StyleDistribution from './components/StyleDistribution.vue'
import AgeDistribution from './components/AgeDistribution.vue'
import LanguageDistribution from './components/LanguageDistribution.vue'
import FriendsActivity from './components/FriendsActivity.vue'

const tabs = [
  { id: 'week', label: 'listen_data_tab_week' },
  { id: 'month', label: 'listen_data_tab_month' },
  { id: 'year', label: 'listen_data_tab_year' },
]

// 计算指定类型的结束时间戳
const getEndTime = (type, offset = 0) => {
  const now = new Date()
  let targetDate = new Date(now)

  if (type === 'week') {
    // 本周六 0点 (周期是 周日0点 -> 周六24点)
    const dayOfWeek = now.getDay() // 0=周日, 1=周一, ..., 6=周六
    const daysToSaturday = (6 - dayOfWeek + 7) % 7 // 到本周六的天数
    targetDate.setDate(now.getDate() + daysToSaturday + (offset * 7))
    targetDate.setHours(0, 0, 0, 0)
  } else if (type === 'month') {
    // 本月最后一天 0点，然后偏移月份
    const targetMonth = now.getMonth() + offset
    const lastDay = new Date(now.getFullYear(), targetMonth + 1, 0)
    lastDay.setHours(0, 0, 0, 0)
    targetDate = lastDay
  } else if (type === 'year') {
    // 今年12月31日 0点，然后偏移年份
    const targetYear = now.getFullYear() + offset
    targetDate = new Date(targetYear, 11, 31, 0, 0, 0, 0)
  }

  return targetDate.getTime()
}

// 获取周期显示标签
const getPeriodLabel = (type, offset) => {
  const now = new Date()
  if (type === 'week') {
    const endDate = new Date(getEndTime(type, offset))
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 6)
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${fmt(startDate)} - ${fmt(endDate)}`
  } else if (type === 'month') {
    const endDate = new Date(getEndTime(type, offset))
    return `${endDate.getFullYear()}/${String(endDate.getMonth() + 1).padStart(2, '0')}`
  } else if (type === 'year') {
    // 年报显示：当前选中的年份
    return String(now.getFullYear() + offset)
  }
  return ''
}

export default {
  name: 'ListenData',
  components: {
    ListenProgress,
    ListenTimeChart,
    TopArtists,
    TopSongs,
    SongWall,
    StyleDistribution,
    AgeDistribution,
    LanguageDistribution,
    FriendsActivity,
  },
  setup() {
    const router = useRouter()
    const activeTab = ref('week')
    const periodOffset = ref(-1) // 默认显示上一个完成周期
    const isLoading = ref(false)
    const reportData = ref(null)
    const loadError = ref(false)
    let requestToken = 0

    const currentEndTime = computed(() => getEndTime(activeTab.value, periodOffset.value))
    const serviceConfigured = computed(() => Boolean(normalizeWyApiBaseUrl(appSetting['wy.apiBaseUrl'])))
    const loggedIn = computed(() => Boolean(appSetting['common.wy_cookie']))
    const needsSettings = computed(() => !serviceConfigured.value || !loggedIn.value)
    const emptyTitleKey = computed(() => {
      if (!serviceConfigured.value) return 'listen_data_service_missing_title'
      if (!loggedIn.value) return 'listen_data_login_missing_title'
      if (loadError.value) return 'listen_data_load_failed_title'
      return 'listen_data_no_data'
    })
    const emptyDescriptionKey = computed(() => {
      if (!serviceConfigured.value) return 'listen_data_service_missing_desc'
      if (!loggedIn.value) return 'listen_data_login_missing_desc'
      if (loadError.value) return 'listen_data_load_failed_desc'
      return 'listen_data_no_data'
    })
    const periodLabel = computed(() => {
      if (activeTab.value === 'year' && reportData.value?.yearItems) {
        // 年报：从已获取的 yearItems 中取对应偏移的年份
        const index = Math.abs(periodOffset.value) - 1
        return String(reportData.value.yearItems[index]?.year || new Date().getFullYear())
      }
      return getPeriodLabel(activeTab.value, periodOffset.value)
    })
    const isCurrentPeriodFlag = computed(() => {
      return activeTab.value === 'year' ? periodOffset.value >= -1 : periodOffset.value >= 0
    })
    const isOldestPeriod = computed(() => {
      if (activeTab.value !== 'year' || !reportData.value?.yearItems?.length) return false
      return Math.abs(periodOffset.value) >= reportData.value.yearItems.length
    })

    const loadData = async() => {
      const token = ++requestToken
      const cookie = appSetting['common.wy_cookie']
      loadError.value = false
      if (!serviceConfigured.value || !cookie) {
        reportData.value = null
        isLoading.value = false
        return
      }
      isLoading.value = true
      try {
        let data
        if (activeTab.value === 'year') {
          data = await wyUtil.getListenDataYearReport(cookie)
        } else {
          // 本周/本月使用实时API，历史周期使用原API
          if (periodOffset.value === 0) {
            data = await wyUtil.getListenDataRealtimeReport(activeTab.value, cookie)
          } else {
            data = await wyUtil.getListenDataReport(activeTab.value, cookie, currentEndTime.value)
          }
        }
        if (token !== requestToken) return
        reportData.value = data
      } catch {
        if (token !== requestToken) return
        loadError.value = true
        reportData.value = null
      } finally {
        if (token === requestToken) isLoading.value = false
      }
    }

    const switchTab = (tabId) => {
      activeTab.value = tabId
      periodOffset.value = -1 // 切换 Tab 时默认显示上一个完成周期
      void loadData()
    }

    const prevPeriod = () => {
      if (isOldestPeriod.value) return
      periodOffset.value -= 1
      if (activeTab.value !== 'year') {
        void loadData()
      }
    }

    const nextPeriod = () => {
      if (isCurrentPeriodFlag.value) return
      periodOffset.value += 1
      if (activeTab.value !== 'year') {
        void loadData()
      }
    }

    const goBack = () => {
      router.back()
    }

    const goToSettings = () => {
      void router.push({ path: '/setting', query: { name: 'SettingWy' } })
    }

    watch(
      [() => appSetting['wy.apiBaseUrl'], () => appSetting['common.wy_cookie']],
      () => void loadData()
    )

    void loadData()

    return {
      tabs,
      activeTab,
      periodOffset,
      isLoading,
      reportData,
      emptyTitleKey,
      emptyDescriptionKey,
      needsSettings,
      periodLabel,
      isCurrentPeriod: isCurrentPeriodFlag,
      isOldestPeriod,
      switchTab,
      prevPeriod,
      nextPeriod,
      goBack,
      goToSettings,
      loadData,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background: var(--color-canvas, var(--color-main-background));
  color: var(--color-text, var(--color-font));
}

.header {
  width: min(100%, 1120px);
  box-sizing: border-box;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 28px 14px;
  flex-shrink: 0;
}

.headerBack,
.periodButton {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border, var(--color-primary-alpha-900));
  border-radius: @radius-medium;
  padding: 10px;
  color: var(--color-text-muted, var(--color-font-label));
  background: var(--color-surface, var(--color-main-background));
  cursor: pointer;
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out, transform @motion-press @ease-out;
  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  &:active { transform: scale(.95); }
  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: 2px;
  }
  &:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
}

.headerTitle {
  min-width: 0;
  flex: 1;
  .eyebrow {
    display: block;
    color: var(--color-brand, var(--color-primary));
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0;
    line-height: 1.3;
  }
  h1 {
    overflow: hidden;
    margin: 4px 0 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-family-display, @font-family-display);
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
  }
}

.headerMark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: @radius-medium;
  color: #fff;
  background: var(--color-brand, var(--color-primary));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 18px;
  font-weight: 750;
}

.periodNav {
  width: min(100%, 1120px);
  box-sizing: border-box;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 28px 18px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900));
}

.tabs {
  display: flex;
  min-width: 0;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--color-border, var(--color-primary-alpha-900));
  border-radius: @radius-medium;
  background: var(--color-surface, var(--color-main-background));
}

.tabWrap { display: flex; min-width: 0; }

.tab {
  min-width: 68px;
  min-height: 34px;
  border: 0;
  border-radius: @radius-small;
  padding: 0 14px;
  color: var(--color-text-muted, var(--color-font-label));
  background: transparent;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out;
  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: -2px;
  }
  &.active {
    color: var(--color-text, var(--color-font));
    background: var(--color-canvas, var(--color-main-background));
    box-shadow: 0 1px 2px rgba(23, 26, 28, .08);
    font-weight: 650;
  }
}

.periodControls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.periodButton {
  width: 34px;
  height: 34px;
  padding: 8px;
  border: 0;
  background: transparent;
}

.periodLabel {
  min-width: 118px;
  color: var(--color-text-muted, var(--color-font-label));
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.content {
  width: min(100%, 1120px);
  box-sizing: border-box;
  align-self: center;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 36px;
}

.loading {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--color-text-muted, var(--color-font-label));
  font-size: 13px;
}

.loadingMark,
.emptyMark {
  display: grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: @radius-medium;
  color: var(--color-brand, var(--color-primary));
  background: var(--color-primary-alpha-900, var(--color-surface));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 20px;
  font-weight: 750;
}

.loadingMark { animation: report-pulse 1.2s var(--ease-in-out, cubic-bezier(.77, 0, .175, 1)) infinite; }

.empty {
  display: flex;
  min-height: min(48vh, 360px);
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
}

.emptyMark {
  width: 64px;
  height: 64px;
  margin-bottom: 18px;
  font-size: 30px;
}

.emptyEyebrow {
  margin: 0;
  color: var(--color-brand, var(--color-primary));
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0;
  text-transform: uppercase;
}

.empty h2 {
  max-width: 480px;
  margin: 10px 0 0;
  font-family: var(--font-family-display, @font-family-display);
  font-size: 28px;
  line-height: 1.25;
}

.emptyDescription {
  max-width: 520px;
  margin: 10px 0 0;
  color: var(--color-text-muted, var(--color-font-label));
  font-size: 13px;
  line-height: 1.65;
}

.emptyActions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 22px;
}

.primaryAction,
.secondaryAction {
  min-height: 40px;
  border: 1px solid transparent;
  border-radius: @radius-medium;
  padding: 0 16px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color @motion-press @ease-out, color @motion-press @ease-out, transform @motion-press @ease-out;
  &:active { transform: translateY(1px); }
  &:focus-visible {
    outline: 2px solid var(--color-focus, var(--color-primary));
    outline-offset: 2px;
  }
}

.primaryAction {
  color: #fff;
  background: var(--color-brand, var(--color-primary));
}

.secondaryAction {
  color: var(--color-text, var(--color-font));
  border-color: var(--color-border, var(--color-primary-alpha-900));
  background: var(--color-surface, var(--color-main-background));
}

@keyframes report-pulse {
  0%, 100% { opacity: .55; transform: scale(.96); }
  50% { opacity: 1; transform: scale(1); }
}

@media (hover: hover) and (pointer: fine) {
  .headerBack:hover,
  .periodButton:hover {
    color: var(--color-brand, var(--color-primary));
    background: var(--color-primary-alpha-900, var(--color-surface));
  }
  .tab:hover { color: var(--color-text, var(--color-font)); }
  .primaryAction:hover,
  .secondaryAction:hover { transform: translateY(-1px); }
}

@media (max-width: 720px) {
  .header { padding: 16px 18px 12px; }
  .periodNav { align-items: stretch; flex-direction: column; padding-inline: 18px; gap: 12px; }
  .tabs { width: 100%; }
  .tab { flex: 1; min-width: 0; }
  .periodControls { justify-content: center; }
  .content { padding: 20px 18px 30px; }
  .headerMark { width: 34px; height: 34px; }
  .headerTitle h1 { font-size: 22px; }
  .empty h2 { font-size: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .headerBack,
  .periodButton,
  .tab,
  .primaryAction,
  .secondaryAction { transition-duration: var(--motion-reduced, 140ms); }
  .loadingMark { animation: none; }
}
</style>
