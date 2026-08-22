<template>
  <input
    ref="dom_input"
    :class="$style.input"
    :type="type"
    :placeholder="placeholder"
    :aria-label="ariaLabel || placeholder || undefined"
    :value="modelValue"
    :disabled="controlState.disabled"
    :aria-disabled="controlState.disabled ? 'true' : undefined"
    :aria-busy="controlState.ariaBusy"
    @input="handleInput"
    @change="$emit('change', $event.target.value.trim())"
    @keydown.enter="handleSubmit"
    @compositionstart="isComposing = true"
    @compositionend="isComposing = false"
    @contextmenu="handleContextMenu"
  />
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'
import { getControlState, shouldSubmitFromEnter } from './a11y'

export default {
  props: {
    placeholder: {
      type: String,
      default: '',
    },
    ariaLabel: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    trim: {
      type: Boolean,
      default: true,
    },
    stopContentEventPropagation: {
      type: Boolean,
      default: true,
    },
    autoPaste: {
      type: Boolean,
      default: true,
    },
    // bindValue: {
    //   type: Boolean,
    //   default: true,
    // },
  },
  emits: ['update:modelValue', 'submit', 'change'],
  data() {
    return {
      isComposing: false,
    }
  },
  computed: {
    controlState() {
      return getControlState(this.disabled, this.loading)
    },
  },
  methods: {
    handleInput(event) {
      let value = event.target.value
      if (this.trim) {
        value = value.trim()
        event.target.value = value
      }
      this.$emit('update:modelValue', value)
    },
    handleSubmit(event) {
      if (this.isComposing || !shouldSubmitFromEnter(event)) return
      event.preventDefault()
      this.$emit('submit', event.target.value.trim())
    },
    focus() {
      this.$refs.dom_input?.focus()
    },
    handleContextMenu(event) {
      if (this.stopContentEventPropagation) event.stopPropagation()
      if (!this.autoPaste) return
      let dom_input = this.$refs.dom_input
      if (dom_input.selectionStart === null) return
      let str = clipboardReadText()
      str = str.trim()
      str = str.replace(/\t|\r\n|\n|\r/g, ' ')
      str = str.replace(/\s+/g, ' ')
      const text = dom_input.value
      // if (dom_input.selectionStart == dom_input.selectionEnd) {
      const value =
        text.substring(0, dom_input.selectionStart) +
        str +
        text.substring(dom_input.selectionEnd, text.length)
      event.target.value = value
      this.$emit('update:modelValue', value)
      // } else {
      //   clipboardWriteText(text.substring(dom_input.selectionStart, dom_input.selectionEnd))
      // }
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.input {
  display: inline-block;
  border: none;
  border-radius: @form-radius;
  padding: 7px 8px;
  color: var(--color-button-font);
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: background-color 0.2s ease;
  background-color: var(--color-primary-background);
  font-size: 13.3px;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[disabled] {
    opacity: 0.4;
  }

  &:hover,
  &:focus {
    background-color: var(--color-primary-background-hover);
  }
  &:active {
    background-color: var(--color-primary-background-active);
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
