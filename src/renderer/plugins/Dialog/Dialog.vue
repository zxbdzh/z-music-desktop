<template>
  <Modal
    :show="visible"
    :close-btn="false"
    :teleport="teleport"
    :labelledby="messageId"
    initial-focus="[data-dialog-confirm]"
    @close="handleCancel"
    @after-leave="afterLeave"
  >
    <main :id="messageId" class="scroll" :class="[$style.main, { select: selection }]">
      {{ message }}
    </main>
    <footer :class="$style.footer">
      <Btn v-if="showCancel" :class="$style.btn" @click="handleCancel">{{ cancelBtnText }}</Btn>
      <Btn data-dialog-confirm :class="$style.btn" @click="handleConfirm">{{ confirmBtnText }}</Btn>
    </footer>
  </Modal>
</template>

<script>
import Modal from '@renderer/components/material/Modal.vue'
import Btn from '@renderer/components/base/Btn.vue'
import { useI18n } from '@renderer/plugins/i18n'
import { computed } from '@common/utils/vueTools'

let dialogId = 0

export default {
  components: { Modal, Btn },
  props: {
    message: { type: String, default: '' },
    showCancel: { type: Boolean, default: false },
    cancelButtonText: { type: String, default: '' },
    confirmButtonText: { type: String, default: '' },
    teleport: { type: String, default: '#root' },
    selection: { type: Boolean, default: false },
    afterLeave: { type: Function, default: () => {} },
    onResolve: { type: Function, default: () => {} },
  },
  setup() {
    const t = useI18n()
    const defaultBtnTexts = computed(() => ({
      confirm: t('confirm_button_text'),
      cancel: t('cancel_button_text'),
    }))
    return { defaultBtnTexts }
  },
  data() {
    return {
      visible: false,
      messageId: `dialog-message-${++dialogId}`,
      resolved: false,
    }
  },
  computed: {
    cancelBtnText() {
      return this.cancelButtonText || this.defaultBtnTexts.cancel
    },
    confirmBtnText() {
      return this.confirmButtonText || this.defaultBtnTexts.confirm
    },
  },
  methods: {
    settle(value) {
      if (this.resolved) return
      this.resolved = true
      this.visible = false
      this.onResolve(value)
    },
    handleCancel() {
      this.settle(false)
    },
    handleConfirm() {
      this.settle(true)
    },
  },
}
</script>

<style lang="less" module>
.main {
  flex: auto;
  min-height: 40px;
  padding: 15px 15px 0;
  font-size: 14px;
  min-width: 220px;
  line-height: 1.5;
  white-space: pre-line;
}

.footer {
  flex: none;
  padding: 15px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  gap: 15px;
}
</style>
