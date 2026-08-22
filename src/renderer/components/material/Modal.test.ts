import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Modal from './Modal.vue'
import { resetModalStack } from '@renderer/plugins/Dialog/modalStack'

interface ModalInstance {
  handleShowChange: (value: boolean) => Promise<void>
  handleAfterLeave: (event: Event) => void
}

const flushTicks = async () => {
  await nextTick()
  await nextTick()
}

const mountModal = () => {
  const modal = ref<ModalInstance>()
  const onClose = vi.fn()
  const mountPoint = document.createElement('div')
  const teleportTarget = document.createElement('div')
  teleportTarget.id = 'modal-test-target'
  document.body.append(mountPoint, teleportTarget)
  const app = createApp({
    render: () => h(Modal, { ref: modal, show: false, teleport: '#modal-test-target', onClose }),
  })
  app.mount(mountPoint)
  return { app, modal, onClose, teleportTarget }
}

describe('Modal async activation', () => {
  beforeEach(() => {
    resetModalStack()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    resetModalStack()
    document.body.innerHTML = ''
  })

  it('cancels a pending activation when hidden before nextTick', async () => {
    const { app, modal, onClose, teleportTarget } = mountModal()
    const instance = modal.value!

    void instance.handleShowChange(true)
    void instance.handleShowChange(false)
    await flushTicks()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(teleportTarget.classList.contains('show-modal')).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
    app.unmount()
  })

  it('cancels pending activation and cleanup when unmounted', async () => {
    const { app, modal, onClose, teleportTarget } = mountModal()

    void modal.value!.handleShowChange(true)
    app.unmount()
    await flushTicks()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(teleportTarget.classList.contains('show-modal')).toBe(false)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('reuses one registration across a close-reopen race and fully unregisters', async () => {
    const { app, modal, onClose, teleportTarget } = mountModal()
    const instance = modal.value!

    void instance.handleShowChange(true)
    await flushTicks()
    void instance.handleShowChange(false)
    void instance.handleShowChange(true)
    await flushTicks()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(teleportTarget.classList.contains('show-modal')).toBe(true)

    void instance.handleShowChange(false)
    instance.handleAfterLeave(new Event('transitionend'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(teleportTarget.classList.contains('show-modal')).toBe(false)
    app.unmount()
  })
})
