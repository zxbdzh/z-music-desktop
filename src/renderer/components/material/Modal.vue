<template>
  <teleport :to="teleport">
    <div v-if="mounted" ref="container" :class="$style.container">
      <transition name="modal-backdrop">
        <div
          v-show="visible"
          :class="[$style.modal, { [$style.filter]: filter }]"
          @click="bgClose && close()"
        >
          <transition
            name="modal-content"
            @after-enter="$emit('after-enter', $event)"
            @after-leave="handleAfterLeave"
          >
            <div
              v-show="visible"
              ref="content"
              :class="$style.content"
              :style="contentStyle"
              role="dialog"
              aria-modal="true"
              :aria-label="accessibleLabel"
              :aria-labelledby="resolvedLabelledby"
              :aria-describedby="describedby || undefined"
              tabindex="-1"
              @click.stop
            >
              <h2 v-if="title" :id="titleId" :class="$style.srOnly">{{ title }}</h2>
              <header :class="$style.header">
                <button v-if="closeBtn" type="button" :aria-label="closeLabel" @click="close">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xlink="http://www.w3.org/1999/xlink"
                    height="100%"
                    viewBox="0 0 212.982 212.982"
                    space="preserve"
                    aria-hidden="true"
                  >
                    <use xlink:href="#icon-delete" />
                  </svg>
                </button>
              </header>
              <slot />
            </div>
          </transition>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script>
import { nextTick } from 'vue'
import { focusModal, openModal } from '@renderer/plugins/Dialog/modalStack'

let modalId = 0
const targetCounts = new Map()

export default {
  props: {
    show: { type: Boolean, default: false },
    closeBtn: { type: Boolean, default: true },
    closeLabel: { type: String, default: 'Close dialog' },
    bgClose: { type: Boolean, default: false },
    teleport: { type: String, default: '#root' },
    title: { type: String, default: '' },
    labelledby: { type: String, default: '' },
    describedby: { type: String, default: '' },
    ariaLabel: { type: String, default: 'Dialog' },
    initialFocus: { type: String, default: '' },
    maxWidth: { type: String, default: '76%' },
    minWidth: { type: String, default: '280px' },
    maxHeight: { type: String, default: '76%' },
    width: { type: String, default: 'auto' },
    height: { type: String, default: 'auto' },
  },
  emits: ['after-enter', 'after-leave', 'close'],
  data() {
    const id = ++modalId
    return {
      titleId: `modal-title-${id}`,
      mounted: false,
      visible: false,
      unregisterModal: null,
      target: null,
      activationGeneration: 0,
      desiredVisible: this.show,
    }
  },
  computed: {
    contentStyle() {
      return {
        maxWidth: this.maxWidth,
        minWidth: this.minWidth,
        width: this.width,
        height: this.height,
        maxHeight: this.maxHeight,
      }
    },
    resolvedLabelledby() {
      return this.labelledby || (this.title ? this.titleId : undefined)
    },
    accessibleLabel() {
      return this.resolvedLabelledby ? undefined : this.ariaLabel
    },
    filter() {
      return this.teleport === '#root' || (targetCounts.get(this.target) ?? 0) > 1
    },
  },
  watch: {
    show(value) {
      this.handleShowChange(value)
    },
  },
  mounted() {
    if (this.show) this.handleShowChange(true)
  },
  beforeUnmount() {
    this.desiredVisible = false
    this.activationGeneration++
    this.deactivate()
  },
  methods: {
    async handleShowChange(value) {
      const generation = ++this.activationGeneration
      this.desiredVisible = value
      if (!value) {
        this.visible = false
        if (!this.unregisterModal) this.mounted = false
        return
      }
      if (this.visible) return
      this.mounted = true

      if (this.unregisterModal) {
        this.visible = true
        await nextTick()
        if (
          generation === this.activationGeneration &&
          this.desiredVisible &&
          this.$refs.content
        ) {
          focusModal(this.$refs.content, this.initialFocus)
        }
        return
      }

      await nextTick()
      if (
        generation !== this.activationGeneration ||
        !this.desiredVisible ||
        !this.$refs.container ||
        !this.$refs.content
      ) {
        return
      }

      this.target = this.$refs.container.parentElement
      if (!this.target) return
      targetCounts.set(this.target, (targetCounts.get(this.target) ?? 0) + 1)
      this.target.classList.add('show-modal')
      try {
        this.unregisterModal = openModal(this.$refs.content, this.close)
      } catch (error) {
        this.deactivate()
        this.mounted = false
        throw error
      }
      this.visible = true
      await nextTick()
      if (
        generation === this.activationGeneration &&
        this.desiredVisible &&
        this.$refs.content
      ) {
        focusModal(this.$refs.content, this.initialFocus)
      }
    },
    deactivate() {
      this.unregisterModal?.()
      this.unregisterModal = null
      if (!this.target) return
      const count = Math.max(0, (targetCounts.get(this.target) ?? 1) - 1)
      if (count) targetCounts.set(this.target, count)
      else {
        targetCounts.delete(this.target)
        this.target.classList.remove('show-modal')
      }
      this.target = null
    },
    close() {
      this.$emit('close')
    },
    handleAfterLeave(event) {
      if (this.desiredVisible || this.visible) return
      this.activationGeneration++
      this.deactivate()
      this.$emit('after-leave', event)
      this.mounted = false
    },
  },
}
</script>

<style lang="less" module>
.container {
  position: absolute;
  inset: 0;
  z-index: 99;
}

.modal {
  width: 100%;
  height: 100%;
  display: grid;
  align-items: center;
  justify-items: center;

  &.filter {
    backdrop-filter: grayscale(70%);
  }
}

.content {
  position: relative;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  min-width: 220px;
  display: flex;
  flex-flow: column nowrap;
  z-index: 100;
  background-color: var(--color-content-background);
}

.header {
  flex: none;
  background-color: var(--color-primary-light-100-alpha-100);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 18px;

  button {
    border: none;
    cursor: pointer;
    padding: 4px 7px;
    background-color: transparent;
    color: var(--color-primary-dark-500-alpha-500);
    transition: background-color 0.2s ease;
    line-height: 0;

    svg { height: 0.7em; }
    &:hover { background-color: var(--color-primary-dark-100-alpha-600); }
    &:active { background-color: var(--color-primary-dark-200-alpha-600); }
    &:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--color-focus, var(--color-primary));
      outline-offset: 2px;
    }
  }
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

:global(.modal-backdrop-enter-active),
:global(.modal-backdrop-leave-active) {
  transition: opacity 180ms ease;
}
:global(.modal-backdrop-enter-from),
:global(.modal-backdrop-leave-to) {
  opacity: 0;
}
:global(.modal-content-enter-active) {
  transition: opacity 220ms ease, transform 220ms ease;
}
:global(.modal-content-leave-active) {
  transition: opacity 140ms ease, transform 140ms ease;
}
:global(.modal-content-enter-from),
:global(.modal-content-leave-to) {
  opacity: 0;
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  :global(.modal-content-enter-active) { transition: opacity 220ms ease; }
  :global(.modal-content-leave-active) { transition: opacity 140ms ease; }
  :global(.modal-content-enter-from),
  :global(.modal-content-leave-to) { transform: none; }
}
</style>
