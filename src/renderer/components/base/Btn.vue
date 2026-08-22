<template>
  <button
    :class="[$style.btn, { [$style.min]: min }, { [$style.outline]: outline }]"
    :type="type"
    :disabled="controlState.disabled"
    :aria-disabled="controlState.disabled ? 'true' : undefined"
    :aria-busy="controlState.ariaBusy"
  >
    <slot />
  </button>
</template>

<script>
import { getControlState } from './a11y'

export default {
  props: {
    min: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'button',
    },
  },
  computed: {
    controlState() {
      return getControlState(this.disabled, this.loading)
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  display: inline-block;
  border: none;
  border-radius: @form-radius;
  cursor: pointer;
  padding: 8px 15px;
  color: var(--color-button-font);
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: background-color 0.2s ease;
  background-color: var(--color-button-background);
  font-size: 14px;
  &[disabled] {
    opacity: 0.4;
    cursor: default;
  }

  &.outline {
    background-color: transparent;
  }

  &:hover {
    background-color: var(--color-button-background-hover);
  }
  &:active {
    background-color: var(--color-button-background-active);
  }
  &:focus-visible {
    outline-color: var(--color-focus, var(--color-primary));
  }
}

.min {
  padding: 3px 8px;
  font-size: 12px;
}
</style>
