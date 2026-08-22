import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./Dialog.vue', () => ({
  default: defineComponent({
    props: {
      showCancel: Boolean,
      onResolve: Function,
      afterLeave: Function,
    },
    data: () => ({ visible: false }),
    render() {
      return h(
        'button',
        {
          id: 'confirm-dialog',
          'data-show-cancel': String(this.showCancel),
          onClick: () => {
            this.onResolve?.(true)
            this.afterLeave?.()
          },
        },
        'Confirm'
      )
    },
  }),
}))

describe('dialog compatibility API', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>'
  })

  it('keeps a real confirmation as a boolean promise', async () => {
    const { dialog } = await import('./index.js')
    const result = dialog.confirm('Delete item?')
    await nextTick()
    const button = document.getElementById('confirm-dialog') as HTMLButtonElement

    expect(button.dataset.showCancel).toBe('true')
    button.click()
    await expect(result).resolves.toBe(true)
  })
})
