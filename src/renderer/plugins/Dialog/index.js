import Dialog from './Dialog.vue'
import { createApp } from 'vue'

const defaultOptions = {
  message: '',
  teleport: '#root',
  showCancel: false,
  cancelButtonText: '',
  confirmButtonText: '',
  selection: false,
}

export const dialog = function (options) {
  const props = Object.assign(
    {},
    defaultOptions,
    typeof options === 'string' ? { message: options } : options || {}
  )

  return new Promise((resolve) => {
    const container = document.createElement('div')
    let app
    let settled = false
    const cleanup = () => {
      setTimeout(() => {
        app?.unmount()
        app = null
        container.remove()
      }, 0)
    }
    const settle = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    app = createApp(Dialog, {
      ...props,
      onResolve: settle,
      afterLeave: cleanup,
    })
    const instance = app.mount(container)
    const mountTarget = document.getElementById('container') ?? document.body
    mountTarget.appendChild(container)
    instance.visible = true
  })
}

dialog.confirm = (options) =>
  dialog(
    typeof options === 'string'
      ? { message: options, showCancel: true }
      : { ...options, showCancel: true }
  )

const dialogPlugin = {
  install(app) {
    app.config.globalProperties.$dialog = dialog
  },
}

export default dialogPlugin
