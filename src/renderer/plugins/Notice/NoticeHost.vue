<template>
  <section :class="$style.host" aria-live="polite" aria-atomic="false" aria-relevant="additions text">
    <transition-group name="notice-list" tag="div" :class="$style.list">
      <article v-for="item in noticeItems" :key="item.id" :class="[$style.notice, $style[item.type]]">
        <span :class="$style.indicator" aria-hidden="true" />
        <span :class="$style.message">{{ item.message }}</span>
        <button v-if="item.action" type="button" :class="$style.action" @click="runAction(item)">
          {{ item.action.label }}
        </button>
        <button
          v-if="item.dismissible"
          type="button"
          :class="$style.dismiss"
          aria-label="Dismiss notification"
          @click="notice.dismiss(item.id)"
        >
          &times;
        </button>
      </article>
    </transition-group>
  </section>
</template>

<script setup lang="ts">
import { notice, noticeItems, type NoticeItem } from './index'

const runAction = (item: NoticeItem) => {
  const action = item.action
  if (!action) return
  const generation = item.generation
  action.onClick()
  const current = noticeItems.find((noticeItem) => noticeItem.id === item.id)
  if (current?.generation === generation && current.action === action) notice.dismiss(item.id)
}
</script>

<style lang="less" module>
.host {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 130;
  width: min(360px, calc(100% - 40px));
  pointer-events: none;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice {
  min-height: 42px;
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 0;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  color: var(--color-font);
  background: var(--color-content-background);
  pointer-events: auto;
}

.indicator {
  align-self: stretch;
  border-radius: 0 2px 2px 0;
  background: #3977d5;
}
.success .indicator { background: #23884f; }
.error .indicator { background: #c43f4b; }
.loading .indicator {
  background: #3977d5;
  animation: notice-pulse 1s ease-in-out infinite alternate;
}

.message {
  min-width: 0;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.action,
.dismiss {
  border: 0;
  color: var(--color-button-font);
  background: var(--color-button-background);
  cursor: pointer;
}
.action {
  padding: 5px 8px;
  border-radius: 4px;
}
.dismiss {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 20px;
  line-height: 28px;
  background: transparent;
  color: var(--color-font);
}

:global(.notice-list-enter-active),
:global(.notice-list-leave-active) {
  transition: opacity 160ms ease, transform 160ms ease;
}
:global(.notice-list-enter-from),
:global(.notice-list-leave-to) {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes notice-pulse {
  from { opacity: 0.45; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .loading .indicator { animation: none; }
  :global(.notice-list-enter-active),
  :global(.notice-list-leave-active) { transition: opacity 160ms ease; }
  :global(.notice-list-enter-from),
  :global(.notice-list-leave-to) { transform: none; }
}
</style>
