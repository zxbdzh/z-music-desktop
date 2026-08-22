<template>
  <div :class="[$style.aside, { [$style.fullscreen]: isFullscreen }]">
    <div :class="$style.brand" aria-label="z-music-desktop">
      <span :class="$style.mark">Z</span>
      <span :class="$style.name">z-music-desktop</span>
    </div>
    <ControlBtns v-if="appSetting['common.controlBtnPosition'] == 'left'" />
    <NavBar />
  </div>
</template>

<script setup>
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'

import ControlBtns from './ControlBtns.vue'
import NavBar from './NavBar.vue'
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.aside {
  height: 100%;
  box-sizing: border-box;
  border-right: 1px solid var(--color-border, var(--color-primary-alpha-900));
  background: var(--color-surface, var(--color-canvas, var(--color-content-background)));
  color: var(--color-text, var(--color-nav-font));
  transition: background-color @motion-state @ease-out, border-color @motion-state @ease-out;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  display: flex;
  flex-flow: column nowrap;

  &.fullscreen {
    -webkit-app-region: no-drag;
    .brand {
      display: none;
    }
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  min-height: 68px;
  padding: 0 16px;
  color: var(--color-text, var(--color-nav-font));
  flex: none;
  -webkit-app-region: no-drag;
}
.mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: @radius-medium;
  color: #fff;
  background: var(--color-brand, var(--color-primary));
  font-family: var(--font-family-display, @font-family-display);
  font-size: 18px;
  font-weight: 750;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
}
@media (max-width: 980px) {
  .brand { justify-content: center; padding-inline: 0; }
  .name { display: none; }
}
</style>
