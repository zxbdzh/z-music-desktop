<template>
  <div
    :class="[
      $style.toolbar,
      { [$style.fullscreen]: isFullscreen },
      appSetting['common.controlBtnPosition'] == 'left'
        ? $style.controlBtnLeft
        : $style.controlBtnRight,
    ]"
  >
    <SearchInput />
    <div :class="$style.context" aria-live="polite">
      <span :class="$style.contextMark">Z</span>
      <h1>{{ contextTitle }}</h1>
    </div>
    <div :class="$style.spacer" />
    <ControlBtns v-if="appSetting['common.controlBtnPosition'] != 'left'" />
  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { useRoute } from '@common/utils/vueRouter'
import { useI18n } from '@root/lang'
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import ControlBtns from './ControlBtns.vue'
import SearchInput from './SearchInput.vue'

const route = useRoute()
const t = useI18n()

const routeTitleKeys = {
  Home: 'home_title',
  Search: 'nav_discover',
  SongList: 'nav_discover',
  SongListDetail: 'nav_discover',
  Leaderboard: 'nav_discover',
  List: 'nav_library',
  Download: 'nav_library',
  WyCloud: 'nav_library',
  WebdavPlay: 'nav_library',
  Podcast: 'nav_podcast',
  ListenData: 'nav_report',
  Setting: 'nav_settings',
  Artist: 'nav_discover',
  Album: 'nav_discover',
}

const contextTitle = computed(() => {
  const key = route.meta?.title || routeTitleKeys[route.name] || 'nav_home'
  return t(key)
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: @height-toolbar;
  box-sizing: border-box;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border, var(--color-primary-alpha-900));
  color: var(--color-text, var(--color-font));
  background: var(--color-surface, var(--color-main-background));
  -webkit-app-region: drag;
  z-index: 2;
}
.toolbar :global(.container) { flex: none; }
.context {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  -webkit-app-region: no-drag;
}
.contextMark {
  color: var(--color-brand, var(--color-primary));
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0;
}
.context h1 {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 650;
}
.spacer { flex: 1; min-width: 8px; }
.toolbar > :global(.controlBtn) { flex: none; }

@media (max-width: 980px) {
  .toolbar { gap: 10px; padding-inline: 12px; }
  .context { display: none; }
  .toolbar :global(.container) { width: min(48%, 320px); }
}
@media (prefers-reduced-motion: reduce) {
  .toolbar { transition-duration: var(--motion-reduced, 140ms); }
}
</style>
