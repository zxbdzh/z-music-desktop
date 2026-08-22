<template>
  <div ref="dom_root" :class="$style.container">
    <div
      :class="[
        $style.search,
        { [$style.active]: focus },
        { [$style.big]: big },
        { [$style.small]: small },
      ]"
      @focusin="handleFocus"
      @focusout="handleBlur"
    >
      <div :class="$style.form">
        <input
          ref="dom_input"
          role="combobox"
          :value="text"
          :placeholder="placeholder"
          :aria-label="inputLabel"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-controls="listboxId"
          :aria-expanded="isListOpen ? 'true' : 'false'"
          :aria-activedescendant="activeDescendant"
          :aria-busy="loading ? 'true' : undefined"
          @input="handleInput"
          @change="sendEvent('change')"
          @keydown="handleInputKeydown"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          @contextmenu="handleContextMenu"
        />
        <transition enter-active-class="animated zoomIn" leave-active-class="animated zoomOut">
          <button
            v-show="text"
            type="button"
            :aria-label="clearLabel"
            @click="handleClearList"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xlink="http://www.w3.org/1999/xlink"
              height="100%"
              viewBox="0 0 24 24"
              space="preserve"
              aria-hidden="true"
              focusable="false"
            >
              <use xlink:href="#icon-window-close" />
            </svg>
          </button>
        </transition>
        <button type="button" :aria-label="searchLabel" @click="handleSearch">
          <slot>
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xlink="http://www.w3.org/1999/xlink"
              height="100%"
              viewBox="0 0 30.239 30.239"
              space="preserve"
              aria-hidden="true"
              focusable="false"
            >
              <use xlink:href="#icon-search" />
            </svg>
          </slot>
        </button>
        <button
          type="button"
          :class="$style.audioMatchBtn"
          :title="audioMatchLabel"
          :aria-label="audioMatchLabel"
          @click="handleOpenAudioMatch"
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xlink="http://www.w3.org/1999/xlink"
            height="100%"
            viewBox="0 0 24 24"
            space="preserve"
            aria-hidden="true"
            focusable="false"
          >
            <use xlink:href="#icon-mic" />
          </svg>
        </button>
      </div>
      <div
        v-show="isShow"
        :class="$style.list"
        :style="listStyle"
        :aria-hidden="isListOpen ? 'false' : 'true'"
      >
        <ul
          :id="listboxId"
          ref="dom_list"
          role="listbox"
          :aria-label="inputLabel"
          @mouseleave="selectIndex = -1"
        >
          <li
            v-for="(item, index) in list"
            :id="optionId(index)"
            :key="`${item}-${index}`"
            role="option"
            :class="{ [$style.select]: selectIndex === index }"
            :aria-selected="selectIndex === index ? 'true' : 'false'"
            @mouseenter="selectIndex = index"
            @click="handleTemplistClick(index)"
          >
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { clipboardReadText } from '@common/utils/electron'
import { HOTKEY_COMMON } from '@common/hotKey'
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'
import { showAudioMatch } from '@renderer/core/useApp/useAudioMatch'
import {
  getNextEnabledIndex,
  isComposingKeyEvent,
  shouldSubmitFromEnter,
} from '@renderer/components/base/a11y'
import {
  createSearchCompositionState,
  finishSearchComposition,
  readSearchInput,
  startSearchComposition,
} from './searchInputA11y'

const t = useI18n()
let searchInputInstanceId = 0

export default {
  props: {
    placeholder: {
      type: String,
      default: t('search_text'),
    },
    inputLabel: {
      type: String,
      default: t('search'),
    },
    clearLabel: {
      type: String,
      default: `${t('btn_close')} ${t('search')}`,
    },
    searchLabel: {
      type: String,
      default: t('search'),
    },
    audioMatchLabel: {
      type: String,
      default: t('audio_match__tooltip'),
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    visibleList: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    big: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'event'],
  data() {
    return {
      instanceId: ++searchInputInstanceId,
      compositionState: createSearchCompositionState(),
      isShow: false,
      text: this.modelValue,
      selectIndex: -1,
      focus: false,
      listStyle: {
        height: 0,
      },
    }
  },
  computed: {
    listboxId() {
      return `search-input-${this.instanceId}-listbox`
    },
    isListOpen() {
      return this.isShow && this.list.length > 0
    },
    activeDescendant() {
      return this.isListOpen && this.selectIndex > -1
        ? this.optionId(this.selectIndex)
        : undefined
    },
  },
  watch: {
    list() {
      this.selectIndex = -1
      if (this.visibleList && this.list.length) this.showList()
      else this.hideList()
    },
    modelValue(value) {
      if (!this.compositionState.composing) this.text = value
    },
    visibleList(visible) {
      visible ? this.showList() : this.hideList()
    },
  },
  mounted() {
    if (appSetting['search.isFocusSearchBox']) this.handleFocusInput()
    this.handleRegisterEvent('on')
    if (this.visibleList) this.showList()
  },
  beforeUnmount() {
    this.handleRegisterEvent('off')
  },
  methods: {
    optionId(index) {
      return `search-input-${this.instanceId}-option-${index}`
    },
    handleRegisterEvent(action) {
      const eventHub = window.key_event
      const name = action == 'on' ? 'on' : 'off'
      eventHub[name](HOTKEY_COMMON.focusSearchInput.action, this.handleFocusInput)
    },
    handleFocusInput() {
      this.$refs.dom_input?.focus()
    },
    handleTemplistClick(index) {
      this.hideList()
      this.sendEvent('listClick', index)
    },
    handleFocus() {
      if (this.focus) return
      this.focus = true
      this.sendEvent('focus')
      if (this.visibleList && this.list.length) this.showList()
    },
    handleBlur() {
      setTimeout(() => {
        if (this.$refs.dom_root?.contains(document.activeElement)) return
        if (!this.focus) return
        this.focus = false
        this.sendEvent('blur')
      }, 80)
    },
    handleInput(event) {
      const result = readSearchInput(this.compositionState, event.target.value)
      this.text = result.value
      if (!result.commit) return
      event.target.value = result.value
      this.$emit('update:modelValue', result.value)
    },
    handleCompositionStart() {
      startSearchComposition(this.compositionState)
    },
    handleCompositionEnd(event) {
      const value = finishSearchComposition(this.compositionState, event.target.value)
      this.text = value
      event.target.value = value
      this.$emit('update:modelValue', value)
    },
    handleInputKeydown(event) {
      if (this.compositionState.composing || isComposingKeyEvent(event)) return
      if (shouldSubmitFromEnter(event)) {
        event.preventDefault()
        this.handleSearch()
        return
      }
      if (event.key == 'Escape') {
        if (!this.isListOpen) return
        event.preventDefault()
        event.stopPropagation()
        this.hideList()
        return
      }
      if (event.key == 'Tab') {
        this.hideList()
        return
      }
      if (event.key != 'ArrowDown' && event.key != 'ArrowUp') return
      if (!this.visibleList || !this.list.length) return
      event.preventDefault()
      if (!this.isShow) this.showList()
      const nextIndex = getNextEnabledIndex(
        this.list.length,
        this.selectIndex,
        event.key,
        () => false,
        'vertical'
      )
      if (nextIndex > -1) this.selectIndex = nextIndex
    },
    handleSearch() {
      if (this.compositionState.composing) return
      const selectedIndex = this.selectIndex
      this.hideList()
      if (selectedIndex < 0) {
        this.sendEvent('submit')
        return
      }
      this.sendEvent('listClick', selectedIndex)
    },
    showList() {
      if (!this.visibleList || !this.list.length) {
        this.hideList()
        return
      }
      this.isShow = true
      this.$nextTick(() => {
        const list = this.$refs.dom_list
        if (list) this.listStyle.height = list.scrollHeight + 'px'
      })
    },
    hideList() {
      this.isShow = false
      this.listStyle.height = 0
      this.selectIndex = -1
    },
    sendEvent(action, data) {
      this.$emit('event', {
        action,
        data,
      })
    },
    handleContextMenu() {
      let text = clipboardReadText()
      text = text.trim()
      text = text.replace(/\t|\r\n|\n|\r/g, ' ')
      text = text.replace(/\s+/g, ' ')
      const input = this.$refs.dom_input
      if (input.selectionStart == null || input.selectionEnd == null) return
      this.text =
        this.text.substring(0, input.selectionStart) +
        text +
        this.text.substring(input.selectionEnd, this.text.length)
      this.$emit('update:modelValue', this.text)
    },
    handleClearList() {
      this.text = ''
      this.$emit('update:modelValue', this.text)
      this.hideList()
      this.sendEvent('submit')
      this.$nextTick(() => this.$refs.dom_input?.focus())
    },
    handleOpenAudioMatch() {
      showAudioMatch()
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: relative;
  width: 35%;
  height: @height-toolbar * 0.52;
  -webkit-app-region: no-drag;
}

.search {
  position: absolute;
  width: 100%;
  border-radius: @form-radius;
  transition:
    box-shadow 0.4s ease,
    background-color @transition-normal;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--color-primary-light-300-alpha-700);

  &.active {
    background-color: var(--color-primary-light-600-alpha-100);
    box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.2);
    .form {
      input {
        border-bottom-left-radius: 0;
      }
      button:last-child {
        border-bottom-right-radius: 0;
      }
    }
  }
  .form {
    display: flex;
    height: @height-toolbar * 0.52;
    position: relative;
    input {
      flex: auto;
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
      background-color: transparent;
      border: none;
      min-width: 0;
      outline: 2px solid transparent;
      outline-offset: -2px;
      padding: 0 5px;
      overflow: hidden;
      font-size: 13.5px;
      line-height: @height-toolbar * 0.52 + 5px;
      &::placeholder {
        color: var(--color-button-font);
        font-size: 0.98em;
      }
      &:focus-visible {
        outline-color: var(--color-focus, var(--color-primary));
      }
    }
    button {
      flex: none;
      border: none;
      background-color: transparent;
      outline: 2px solid transparent;
      outline-offset: -2px;
      cursor: pointer;
      height: 100%;
      padding: 6px 7px;
      color: var(--color-button-font);
      transition: background-color 0.2s ease;

      &:last-child {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
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

      &.audioMatchBtn {
        border-left: 1px solid var(--color-primary-light-300-alpha-400);

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover svg {
          fill: var(--color-primary);
        }
      }
    }
  }
  .list {
    font-size: 13px;
    transition: height 0.3s ease;
    height: 0;
    overflow: hidden;
    li {
      cursor: pointer;
      padding: 8px 5px;
      transition: background-color 0.2s ease;
      line-height: 1.3;
      span {
        .mixin-ellipsis-2();
      }

      &.select {
        background-color: var(--color-primary-dark-100-alpha-700);
      }
      &:last-child {
        border-bottom-left-radius: 3px;
        border-bottom-right-radius: 3px;
      }
    }
  }
}

.big {
  width: 100%;
  .form {
    height: 30px;
    button {
      padding: 6px 10px;
    }
  }
}
</style>
