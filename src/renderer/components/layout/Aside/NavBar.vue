<template>
  <nav ref="domMenu" :class="$style.nav" :aria-label="$t('primary_navigation')">
    <ul :class="$style.list">
      <li v-for="item in menus" :key="item.id" :class="$style.item">
        <router-link
          :to="item.to"
          :class="[$style.link, { [$style.active]: isActive(item) }]"
          :aria-current="isActive(item) ? 'page' : undefined"
          :title="item.label"
        >
          <svg aria-hidden="true" :viewBox="item.viewBox">
            <use :xlink:href="item.icon" />
          </svg>
          <span :class="$style.label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { computed, ref } from '@common/utils/vueTools'
import { useRoute } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'

const route = useRoute()
const t = useI18n()
const domMenu = ref()

const menus = computed(() =>
  [
    {
      id: 'home',
      to: '/home',
      label: t('nav_home'),
      icon: '#icon-home',
      viewBox: '0 0 24 24',
      paths: ['/home'],
      enabled: true,
    },
    {
      id: 'discover',
      to: '/search',
      label: t('nav_discover'),
      icon: '#icon-compass',
      viewBox: '0 0 24 24',
      paths: ['/search', '/songList', '/leaderboard', '/artist', '/album'],
      enabled: true,
    },
    {
      id: 'library',
      to: '/list',
      label: t('nav_library'),
      icon: '#icon-library',
      viewBox: '0 0 24 24',
      paths: ['/list', '/download', '/wy', '/webdav-play'],
      enabled: true,
    },
    {
      id: 'podcast',
      to: '/podcast',
      label: t('nav_podcast'),
      icon: '#icon-podcast',
      viewBox: '0 0 24 24',
      paths: ['/podcast'],
      enabled: appSetting['podcast.enable'],
    },
    {
      id: 'report',
      to: '/listen-data',
      label: t('nav_report'),
      icon: '#icon-report',
      viewBox: '0 0 24 24',
      paths: ['/listen-data'],
      enabled: true,
    },
    {
      id: 'setting',
      to: '/setting',
      label: t('nav_settings'),
      icon: '#icon-setting',
      viewBox: '0 0 493.23 436.47',
      paths: ['/setting'],
      enabled: true,
    },
  ].filter((item) => item.enabled)
)

const isActive = (item) => item.paths.some((path) => route.path == path || route.path.startsWith(`${path}/`))
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.nav { flex: 1; min-height: 0; padding: 18px 10px; overflow-y: auto; -webkit-app-region: no-drag; }
.list { display: flex; flex-flow: column nowrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
.item { min-width: 0; }
.link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  border-radius: @radius-medium;
  padding: 0 12px;
  color: var(--color-text-muted, var(--color-nav-font));
  text-decoration: none;
  font-size: 13px;
  font-weight: 550;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: color @motion-state @ease-out, background-color @motion-state @ease-out;
  &:hover { color: var(--color-text, var(--color-nav-font)); background: var(--color-surface-raised, var(--color-primary-light-400-alpha-700)); }
  &:focus-visible { outline-color: var(--color-focus, var(--color-primary)); }
  &.active { color: var(--color-brand, var(--color-primary)); background: color-mix(in srgb, var(--color-brand, var(--color-primary)) 12%, transparent); }
  &.active::before { content: ''; position: absolute; left: -10px; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: var(--color-brand, var(--color-primary)); }
  svg { flex: none; width: 19px; height: 19px; fill: currentColor; }
}
.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 980px) {
  .nav { padding-inline: 8px; }
  .link { justify-content: center; padding-inline: 0; }
  .label { display: none; }
  .link.active::before { left: -8px; }
}
@media (prefers-reduced-motion: reduce) {
  .link { transition-duration: var(--motion-reduced, 140ms); }
}
</style>
