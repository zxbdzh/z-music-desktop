<template>
  <teleport to="#root">
    <ul
      ref="dom_menu"
      :class="$style.list"
      :style="menuStyles"
      role="menu"
      :aria-hidden="modelValue ? 'false' : 'true'"
      @keydown="handleKeydown"
    >
      <li
        v-for="(item, index) in menus"
        v-show="isItemVisible(item)"
        :key="item.action"
        role="presentation"
        :aria-hidden="isItemVisible(item) ? undefined : 'true'"
      >
        <button
          ref="menuButtons"
          type="button"
          role="menuitem"
          :class="$style.listItem"
          :tabindex="modelValue && focusedIndex == index ? 0 : -1"
          :aria-label="item[itemName]"
          :disabled="isItemUnavailable(item)"
          :aria-disabled="isItemUnavailable(item) ? 'true' : undefined"
          :aria-busy="item.loading ? 'true' : undefined"
          ignore-tip
          @focus="focusedIndex = index"
          @click="activateItem(item)"
        >
          <span v-if="item.loading" :class="$style.loading" aria-hidden="true">...</span>
          <span v-else>{{ item[itemName] }}</span>
        </button>
      </li>
    </ul>
  </teleport>
</template>

<script>
import { computed, nextTick, ref, watch } from '@common/utils/vueTools'
import useMenuLocation from '@renderer/utils/compositions/useMenuLocation'

import { appSetting } from '@renderer/store/setting'
import {
  getFirstEnabledIndex,
  getNextEnabledIndex,
  getPopupDismissal,
  isActivationKey,
  isComposingKeyEvent,
  restoreFocusIfOwned,
} from './a11y'

export default {
  name: 'MenuToolBar',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    xy: {
      type: Object,
      required: true,
    },
    menus: {
      type: Array,
      default() {
        return []
      },
    },
    itemName: {
      type: String,
      default: 'name',
    },
  },
  emits: ['update:modelValue', 'menu-click'],
  setup(props, { emit }) {
    const visible = computed(() => props.modelValue)
    const location = computed(() => props.xy)
    const menuButtons = ref([])
    const focusedIndex = ref(-1)
    const restoreTarget = ref(null)
    let shouldRestoreFocus = false

    const isItemVisible = (item) =>
      !item.hide && (item.action != 'download' || appSetting['download.enable'])
    const isItemUnavailable = (item) => Boolean(item.disabled || item.loading)
    const isIndexUnavailable = (index) => {
      const item = props.menus[index]
      return !item || !isItemVisible(item) || isItemUnavailable(item)
    }

    const getButtons = () => {
      const buttons = menuButtons.value
      return Array.isArray(buttons) ? buttons : buttons ? [buttons] : []
    }
    const focusItem = (index) => {
      if (index < 0) return
      focusedIndex.value = index
      void nextTick(() => getButtons()[index]?.focus())
    }
    const restoreFocus = () => {
      const target = restoreTarget.value
      restoreTarget.value = null
      if (!target?.isConnected) return
      void nextTick(() => {
        const addTemporaryTabIndex = target.tabIndex < 0 && !target.hasAttribute('tabindex')
        if (addTemporaryTabIndex) target.setAttribute('tabindex', '-1')
        restoreFocusIfOwned(dom_menu.value, target)
        if (addTemporaryTabIndex) target.removeAttribute('tabindex')
      })
    }
    const closeMenu = ({ restore = false, notify = true } = {}) => {
      shouldRestoreFocus = restore
      emit('update:modelValue', false)
      if (notify) emit('menu-click', null)
    }
    const onHide = () => closeMenu({ restore: false, notify: true })

    const { dom_menu, menuStyles } = useMenuLocation({
      visible,
      location,
      onHide,
    })

    const activateItem = (item) => {
      if (isItemUnavailable(item)) return
      shouldRestoreFocus = true
      emit('update:modelValue', false)
      emit('menu-click', item)
    }

    const handleKeydown = (event) => {
      if (isComposingKeyEvent(event)) return
      const dismissal = getPopupDismissal(event.key, 'menu')
      if (dismissal) {
        if (dismissal.preventDefault) event.preventDefault()
        if (event.key == 'Escape') event.stopPropagation()
        closeMenu({ restore: dismissal.restoreFocus, notify: true })
        return
      }

      const buttons = getButtons()
      const targetIndex = buttons.indexOf(event.target)
      if (isActivationKey(event.key)) {
        const item = props.menus[targetIndex]
        if (!item || isIndexUnavailable(targetIndex)) return
        event.preventDefault()
        activateItem(item)
        return
      }

      const currentIndex = targetIndex > -1 ? targetIndex : focusedIndex.value
      const nextIndex = getNextEnabledIndex(
        props.menus.length,
        currentIndex,
        event.key,
        isIndexUnavailable
      )
      if (nextIndex < 0) return
      event.preventDefault()
      focusItem(nextIndex)
    }

    watch(
      () => props.xy.trigger,
      (target) => {
        if (props.modelValue && target instanceof HTMLElement) restoreTarget.value = target
      }
    )

    watch(
      () => props.modelValue,
      (isOpen) => {
        if (isOpen) {
          const contextMenuTarget = props.xy.trigger
          restoreTarget.value =
            contextMenuTarget instanceof HTMLElement
              ? contextMenuTarget
              : document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
          shouldRestoreFocus = false
          focusItem(getFirstEnabledIndex(props.menus.length, isIndexUnavailable))
          return
        }
        focusedIndex.value = -1
        if (shouldRestoreFocus) restoreFocus()
        else restoreTarget.value = null
        shouldRestoreFocus = false
      },
      { immediate: true }
    )

    return {
      dom_menu,
      menuStyles,
      menuButtons,
      focusedIndex,
      activateItem,
      handleKeydown,
      isItemVisible,
      isItemUnavailable,
      appSetting,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  font-size: 12px;
  position: absolute;
  opacity: 0;
  transform: scale(0);
  transform-origin: 0 0 0;
  transition: 0.14s ease;
  transition-property: transform, opacity;
  border-radius: @radius-border;
  background-color: var(--color-content-background);
  box-shadow: 0 1px 8px 0 rgba(0, 0, 0, 0.2);
  z-index: 10;
  overflow: hidden;
}
.listItem {
  display: block;
  width: 100%;
  border: 0;
  color: inherit;
  cursor: pointer;
  min-width: 96px;
  line-height: 34px;
  padding: 0 10px;
  text-align: center;
  outline: 2px solid transparent;
  outline-offset: -2px;
  transition: @transition-normal;
  transition-property: background-color, opacity;
  box-sizing: border-box;
  background-color: transparent;
  font: inherit;
  .mixin-ellipsis-1();

  &:hover:not(:disabled) {
    background-color: var(--color-primary-background-hover);
  }
  &:active:not(:disabled) {
    background-color: var(--color-primary-background-active);
  }
  &:focus-visible {
    outline-color: var(--color-focus, var(--color-primary));
    background-color: var(--color-primary-background-hover);
  }
  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
}
.loading {
  opacity: 0.6;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
