<template>
  <div ref="dom_root" class="content" :class="[$style.select, show ? $style.active : '']">
    <button
      ref="dom_btn"
      type="button"
      role="combobox"
      class="label-content"
      :class="$style.label"
      :disabled="controlState.disabled"
      :aria-label="ariaLabel || label || placeholder || 'Select option'"
      :aria-controls="listId"
      :aria-expanded="show ? 'true' : 'false'"
      :aria-activedescendant="activeDescendant"
      :aria-disabled="controlState.disabled ? 'true' : undefined"
      :aria-busy="controlState.ariaBusy"
      aria-haspopup="listbox"
      @click="handleTriggerClick"
      @keydown="handleTriggerKeydown"
    >
      <span class="label">{{ label || placeholder }}</span>
      <span class="icon" :class="$style.icon" aria-hidden="true">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xlink="http://www.w3.org/1999/xlink"
          height="100%"
          viewBox="0 0 451.847 451.847"
          space="preserve"
          focusable="false"
        >
          <use xlink:href="#icon-down" />
        </svg>
      </span>
    </button>
    <ul
      v-if="show"
      :id="listId"
      ref="dom_list"
      class="selection-list scroll"
      :class="$style.list"
      :style="listStyles"
      role="listbox"
      :aria-busy="loading ? 'true' : undefined"
    >
      <li
        v-for="(item, index) in list"
        :id="optionId(index)"
        :key="itemValue(item, index)"
        role="option"
        :class="[
          $style.listItem,
          { [$style.active]: isSelected(item) },
          { [$style.highlighted]: highlightIndex == index },
        ]"
        :aria-label="itemText(item)"
        :aria-selected="isSelected(item) ? 'true' : 'false'"
        :aria-disabled="isItemUnavailable(item) ? 'true' : undefined"
        @mousemove="handleOptionHover(index)"
        @click="handleOptionClick(item, index)"
      >
        {{ itemText(item) }}
      </li>
    </ul>
  </div>
</template>

<script>
import {
  getControlState,
  getFirstEnabledIndex,
  getNextEnabledIndex,
  getPopupDismissal,
  isActivationKey,
  isComposingKeyEvent,
} from './a11y'

let selectionInstanceId = 0

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    modelValue: {
      type: [String, Number],
      required: true,
    },
    itemName: {
      type: String,
      default: '',
    },
    itemKey: {
      type: String,
      default: '',
    },
    itemDisabled: {
      type: String,
      default: 'disabled',
    },
    itemLoading: {
      type: String,
      default: 'loading',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    ariaLabel: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      instanceId: ++selectionInstanceId,
      show: false,
      highlightIndex: -1,
      listStyles: {
        transform: 'scaleY(0) translateY(0)',
      },
    }
  },
  computed: {
    controlState() {
      return getControlState(this.disabled, this.loading)
    },
    selectedIndex() {
      if (this.modelValue == null) return -1
      return this.list.findIndex((item, index) => this.itemValue(item, index) == this.modelValue)
    },
    label() {
      if (this.selectedIndex < 0) return ''
      return this.itemText(this.list[this.selectedIndex])
    },
    listId() {
      return `base-selection-${this.instanceId}-listbox`
    },
    activeDescendant() {
      return this.show && this.highlightIndex > -1
        ? this.optionId(this.highlightIndex)
        : undefined
    },
  },
  mounted() {
    document.addEventListener('click', this.handleHide, true)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleHide, true)
  },
  methods: {
    itemValue(item, index) {
      if (this.itemKey && item != null && typeof item == 'object') return item[this.itemKey]
      return item ?? index
    },
    itemText(item) {
      if (this.itemName && item != null && typeof item == 'object') return item[this.itemName]
      return String(item ?? '')
    },
    optionId(index) {
      return `base-selection-${this.instanceId}-option-${index}`
    },
    isSelected(item) {
      return this.itemValue(item) == this.modelValue
    },
    isItemUnavailable(item) {
      return Boolean(
        item &&
          typeof item == 'object' &&
          (item[this.itemDisabled] || item[this.itemLoading])
      )
    },
    handleHide(event) {
      if (!this.show || this.$refs.dom_root?.contains(event.target)) return
      this.closeList(false)
    },
    handleTriggerClick() {
      this.show ? this.closeList(false) : this.openList()
    },
    handleTriggerKeydown(event) {
      if (isComposingKeyEvent(event) || this.controlState.disabled) return
      const dismissal = getPopupDismissal(event.key, 'listbox')
      if (dismissal) {
        if (!this.show) return
        if (dismissal.preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }
        this.closeList(dismissal.restoreFocus)
        return
      }
      if (isActivationKey(event.key)) {
        event.preventDefault()
        if (!this.show) {
          this.openList()
        } else if (this.highlightIndex > -1) {
          this.selectOption(this.highlightIndex)
        }
        return
      }

      const nextIndex = getNextEnabledIndex(
        this.list.length,
        this.show ? this.highlightIndex : this.selectedIndex,
        event.key,
        (index) => this.isItemUnavailable(this.list[index])
      )
      if (nextIndex < 0) return
      event.preventDefault()
      if (!this.show) this.openList(nextIndex)
      else this.setHighlight(nextIndex)
    },
    handleOptionHover(index) {
      if (!this.isItemUnavailable(this.list[index])) this.highlightIndex = index
    },
    handleOptionClick(item, index) {
      if (this.isItemUnavailable(item)) return
      this.highlightIndex = index
      this.selectOption(index)
    },
    selectOption(index) {
      const item = this.list[index]
      if (item == null || this.isItemUnavailable(item)) return
      const value = this.itemValue(item, index)
      if (value != this.modelValue) {
        this.$emit('update:modelValue', value)
        this.$emit('change', item)
      }
      this.closeList(true)
    },
    openList(initialIndex) {
      if (this.controlState.disabled || !this.list.length) return
      this.show = true
      const fallbackIndex =
        this.selectedIndex > -1 && !this.isItemUnavailable(this.list[this.selectedIndex])
          ? this.selectedIndex
          : getFirstEnabledIndex(this.list.length, (index) =>
              this.isItemUnavailable(this.list[index])
            )
      this.highlightIndex = initialIndex ?? fallbackIndex
      this.$nextTick(() => {
        if (!this.$refs.dom_list) return
        this.listStyles.transform = `scaleY(1) translateY(${this.handleGetOffset()}px)`
        this.scrollHighlightedOptionIntoView()
      })
    },
    closeList(restoreFocus) {
      this.listStyles.transform = 'scaleY(0) translateY(0)'
      this.show = false
      this.highlightIndex = -1
      if (restoreFocus) this.$nextTick(() => this.$refs.dom_btn?.focus())
    },
    setHighlight(index) {
      this.highlightIndex = index
      this.$nextTick(this.scrollHighlightedOptionIntoView)
    },
    scrollHighlightedOptionIntoView() {
      const list = this.$refs.dom_list
      const activeItem = list?.children[this.highlightIndex]
      if (!list || !activeItem) return
      const itemTop = activeItem.offsetTop
      const itemBottom = itemTop + activeItem.offsetHeight
      if (itemTop < list.scrollTop) list.scrollTop = itemTop
      else if (itemBottom > list.scrollTop + list.clientHeight)
        list.scrollTop = itemBottom - list.clientHeight
    },
    handleGetOffset() {
      const list = this.$refs.dom_list
      const domSelect = list?.offsetParent
      const domContainer = domSelect?.offsetParent
      if (!list || !domSelect || !domContainer) return 0
      const listHeight = list.clientHeight
      const containerHeight = domContainer.clientHeight
      if (containerHeight < listHeight) return 0
      const offsetHeight =
        domContainer.scrollTop + containerHeight - (domSelect.offsetTop + listHeight)
      if (offsetHeight > 0) return 0
      return offsetHeight - 5
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@selection-height: 28px;

.select {
  display: inline-block;
  font-size: 12px;
  position: relative;
  width: var(--selection-width, 300px);

  &.active {
    .label {
      background-color: var(--color-button-background);
    }
    .list {
      opacity: 1;
    }
    .icon svg {
      transform: rotate(180deg);
    }
  }
}

.label {
  width: 100%;
  border: 0;
  background-color: var(--color-button-background);
  padding: 0 10px;
  transition: background-color @transition-normal;
  height: @selection-height;
  line-height: 1.5;
  box-sizing: border-box;
  color: var(--color-button-font);
  border-radius: @form-radius;
  cursor: pointer;
  display: flex;
  align-items: center;
  font: inherit;
  text-align: left;
  outline: 2px solid transparent;
  outline-offset: 2px;

  > span:first-child {
    flex: auto;
    min-width: 0;
    .mixin-ellipsis-1();
  }
  .icon {
    flex: none;
    margin-left: 7px;
    line-height: 0;
    svg {
      width: 1em;
      transition: transform 0.2s ease;
      transform: rotate(0);
    }
  }

  &:hover:not(:disabled) {
    background-color: var(--color-button-background-hover);
  }
  &:active:not(:disabled) {
    background-color: var(--color-button-background-active);
  }
  &:focus-visible {
    outline-color: var(--color-focus, var(--color-primary));
  }
  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}

.list {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background-color: var(--color-content-background);
  opacity: 0;
  transform: scaleY(0) translateY(0);
  transform-origin: 0 (@selection-height / 2) 0;
  transition: 0.25s ease;
  transition-property: transform, opacity;
  z-index: 10;
  border-radius: @form-radius;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.15);
  overflow: auto;
  max-height: 200px;
}
.listItem {
  cursor: pointer;
  padding: 0 10px;
  line-height: @selection-height;
  transition: background-color @transition-normal;
  background-color: transparent;
  box-sizing: border-box;
  .mixin-ellipsis-1();

  &:hover,
  &.highlighted {
    background-color: var(--color-button-background-hover);
  }
  &:active {
    background-color: var(--color-button-background-active);
  }
  &[aria-disabled='true'] {
    cursor: default;
    opacity: 0.5;
  }
  &.active {
    color: var(--color-primary);
  }
}
</style>
