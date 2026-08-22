<template>
  <ul
    :class="[$style.list, $style[align], $style[orientation]]"
    role="tablist"
    :aria-orientation="orientation"
    @keydown="handleKeydown"
  >
    <li v-for="(item, index) in list" :key="itemValue(item, index)" role="presentation">
      <button
        :id="tabId(index)"
        ref="tabButtons"
        type="button"
        role="tab"
        :class="[
          $style.listItem,
          { [$style.active]: isSelected(item) },
          { [$style.loading]: isItemLoading(item) },
        ]"
        :tabindex="tabIndex(index)"
        :disabled="isItemUnavailable(item)"
        :aria-label="itemText(item)"
        :aria-selected="isSelected(item) ? 'true' : 'false'"
        :aria-disabled="isItemUnavailable(item) ? 'true' : undefined"
        :aria-busy="isItemLoading(item) ? 'true' : undefined"
        :aria-controls="itemControl(item)"
        ignore-tip
        @click="handleToggle(item)"
      >
        <span :class="$style.label">{{ itemText(item) }}</span>
      </button>
    </li>
  </ul>
</template>

<script>
import { getFirstEnabledIndex, getNextEnabledIndex, isComposingKeyEvent } from './a11y'

let tabInstanceId = 0

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    align: {
      type: String,
      default: 'left',
    },
    orientation: {
      type: String,
      default: 'horizontal',
      validator(value) {
        return value == 'horizontal' || value == 'vertical'
      },
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemLabel: {
      type: String,
      default: 'label',
    },
    itemDisabled: {
      type: String,
      default: 'disabled',
    },
    itemLoading: {
      type: String,
      default: 'loading',
    },
    itemControls: {
      type: String,
      default: '',
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      instanceId: ++tabInstanceId,
    }
  },
  computed: {
    focusableIndex() {
      const selectedIndex = this.list.findIndex(
        (item) => this.isSelected(item) && !this.isItemUnavailable(item)
      )
      if (selectedIndex > -1) return selectedIndex
      return getFirstEnabledIndex(this.list.length, (index) =>
        this.isItemUnavailable(this.list[index])
      )
    },
  },
  methods: {
    itemValue(item, index) {
      if (item != null && typeof item == 'object' && this.itemKey in item) return item[this.itemKey]
      return item ?? index
    },
    itemText(item) {
      if (item != null && typeof item == 'object' && this.itemLabel in item)
        return item[this.itemLabel]
      return String(item ?? '')
    },
    itemControl(item) {
      if (!this.itemControls || item == null || typeof item != 'object') return undefined
      return item[this.itemControls]
    },
    isSelected(item) {
      return this.modelValue == this.itemValue(item)
    },
    isItemLoading(item) {
      return Boolean(item && typeof item == 'object' && item[this.itemLoading])
    },
    isItemUnavailable(item) {
      return Boolean(
        item &&
          typeof item == 'object' &&
          (item[this.itemDisabled] || item[this.itemLoading])
      )
    },
    tabId(index) {
      return `base-tab-${this.instanceId}-${index}`
    },
    tabIndex(index) {
      return index == this.focusableIndex ? 0 : -1
    },
    handleToggle(item) {
      if (this.isItemUnavailable(item)) return
      const value = this.itemValue(item)
      if (value == this.modelValue) return
      this.$emit('update:modelValue', value)
      this.$emit('change', value)
    },
    getTabButtons() {
      const buttons = this.$refs.tabButtons
      if (!buttons) return []
      return Array.isArray(buttons) ? buttons : [buttons]
    },
    handleKeydown(event) {
      if (isComposingKeyEvent(event)) return
      const buttons = this.getTabButtons()
      const currentIndex = buttons.indexOf(event.target)
      if (currentIndex < 0) return
      const nextIndex = getNextEnabledIndex(
        this.list.length,
        currentIndex,
        event.key,
        (index) => this.isItemUnavailable(this.list[index]),
        this.orientation
      )
      if (nextIndex < 0) return

      event.preventDefault()
      buttons[nextIndex]?.focus()
      this.handleToggle(this.list[nextIndex])
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  display: flex;
  flex-flow: row nowrap;
  font-size: 12px;
  gap: 25px;
  padding: 0 15px;

  &.vertical {
    flex-flow: column nowrap;
    gap: 4px;
  }

  &.left {
    justify-content: flex-start;
  }
  &.center {
    justify-content: center;
  }
  &.right {
    justify-content: flex-end;
  }
}

.listItem {
  display: block;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font: inherit;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: color @transition-normal;

  &:hover:not(:disabled) {
    color: var(--color-primary);
  }
  &:focus-visible {
    outline-color: var(--color-focus, var(--color-primary));
  }
  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
  &.active {
    color: var(--color-primary);
    cursor: default;

    > .label:after {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.loading {
  cursor: progress;
}

.label {
  display: block;
  position: relative;
  padding: 8px 0;
  &:after {
    .mixin-after();
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    border-radius: 20px;
    background-color: var(--color-primary-alpha-300);
    transform: translateY(-4px);
    opacity: 0;
    transition: @transition-fast;
    transition-property: transform, opacity;
  }
}
</style>
