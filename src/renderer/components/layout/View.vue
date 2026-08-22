<template>
  <div :class="$style.view">
    <router-view v-slot="{ Component }">
      <transition name="route-fade" mode="out-in">
        <component :is="Component" class="view-container" />
      </transition>
    </router-view>
  </div>
</template>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.view {
  position: relative;
  z-index: 1;
  > :global(.view-container) {
    position: absolute !important;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
  }
  // background: #fff;
  // overflow: hidden;
}

:global(.route-fade-enter-active),
:global(.route-fade-leave-active) {
  transition: opacity var(--motion-state, 180ms) var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1));
}
:global(.route-fade-enter-from),
:global(.route-fade-leave-to) {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  :global(.route-fade-enter-active),
  :global(.route-fade-leave-active) {
    transition-duration: var(--motion-reduced, 140ms);
  }
}
</style>
