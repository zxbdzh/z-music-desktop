import { reactive, type App } from 'vue'

export type NoticeType = 'info' | 'success' | 'error' | 'loading'

export interface NoticeAction {
  label: string
  onClick: () => void
}

export interface NoticeOptions {
  id?: string
  type?: NoticeType
  message: string
  duration?: number
  dismissible?: boolean
  action?: NoticeAction
}

export type NoticeItem = Required<Pick<NoticeOptions, 'id' | 'type' | 'message' | 'dismissible'>> &
  Pick<NoticeOptions, 'action'> & {
    duration: number
    generation: number
  }

export type NoticeUpdate = Partial<Omit<NoticeOptions, 'id'>>

type PromiseMessage<T> = string | ((value: T) => string | NoticeUpdate)

export interface NoticePromiseOptions<T> {
  id?: string
  loading: string
  success: PromiseMessage<T>
  error: PromiseMessage<unknown>
}

const defaultDuration: Record<NoticeType, number> = {
  info: 4000,
  success: 4000,
  error: 6000,
  loading: 0,
}

export const noticeItems = reactive<NoticeItem[]>([])

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const promiseOwners = new Map<string, symbol>()
let nextId = 0
let nextGeneration = 0

const clearTimer = (id: string) => {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
}

const scheduleDismiss = (item: NoticeItem) => {
  clearTimer(item.id)
  if (item.duration <= 0) return
  timers.set(item.id, setTimeout(() => notice.dismiss(item.id), item.duration))
}

const normalize = (options: NoticeOptions): NoticeItem => {
  const type = options.type ?? 'info'
  const id = options.id ?? `notice-${++nextId}`
  return {
    id,
    type,
    message: options.message,
    duration: options.duration ?? defaultDuration[type],
    dismissible: options.dismissible ?? true,
    action: options.action,
    generation: ++nextGeneration,
  }
}

const resolvePromiseUpdate = <T>(message: PromiseMessage<T>, value: T): NoticeUpdate => {
  const resolved = typeof message === 'function' ? message(value) : message
  return typeof resolved === 'string' ? { message: resolved } : resolved
}

export const notice = {
  create(options: string | NoticeOptions) {
    const item = normalize(typeof options === 'string' ? { message: options } : options)
    promiseOwners.delete(item.id)
    const existing = noticeItems.find((noticeItem) => noticeItem.id === item.id)
    if (existing) Object.assign(existing, item)
    else noticeItems.push(item)
    scheduleDismiss(existing ?? item)
    return item.id
  },
  update(id: string, update: NoticeUpdate) {
    promiseOwners.delete(id)
    const item = noticeItems.find((noticeItem) => noticeItem.id === id)
    if (!item) return false
    const previousType = item.type
    Object.assign(item, update)
    item.generation = ++nextGeneration
    if (update.duration == null && update.type && update.type !== previousType) {
      item.duration = defaultDuration[update.type]
    }
    scheduleDismiss(item)
    return true
  },
  dismiss(id: string) {
    promiseOwners.delete(id)
    const index = noticeItems.findIndex((noticeItem) => noticeItem.id === id)
    if (index < 0) return false
    clearTimer(id)
    noticeItems.splice(index, 1)
    return true
  },
  clear() {
    promiseOwners.clear()
    for (const item of noticeItems) clearTimer(item.id)
    noticeItems.splice(0)
  },
  info(message: string, options: Omit<NoticeOptions, 'message' | 'type'> = {}) {
    return notice.create({ ...options, type: 'info', message })
  },
  success(message: string, options: Omit<NoticeOptions, 'message' | 'type'> = {}) {
    return notice.create({ ...options, type: 'success', message })
  },
  error(message: string, options: Omit<NoticeOptions, 'message' | 'type'> = {}) {
    return notice.create({ ...options, type: 'error', message })
  },
  loading(message: string, options: Omit<NoticeOptions, 'message' | 'type'> = {}) {
    return notice.create({ ...options, type: 'loading', message })
  },
  async promise<T>(task: Promise<T> | (() => Promise<T>), options: NoticePromiseOptions<T>) {
    const id = notice.loading(options.loading, { id: options.id })
    const owner = Symbol(id)
    promiseOwners.set(id, owner)
    try {
      const value = await (typeof task === 'function' ? task() : task)
      if (promiseOwners.get(id) === owner) {
        const update = resolvePromiseUpdate(options.success, value)
        promiseOwners.delete(id)
        notice.update(id, { type: 'success', ...update })
      }
      return value
    } catch (error) {
      if (promiseOwners.get(id) === owner) {
        try {
          const update = resolvePromiseUpdate(options.error, error)
          promiseOwners.delete(id)
          notice.update(id, { type: 'error', ...update })
        } finally {
          if (promiseOwners.get(id) === owner) promiseOwners.delete(id)
        }
      }
      throw error
    }
  },
}

export const resetNoticeState = () => {
  notice.clear()
  nextId = 0
}

const noticePlugin = {
  install(app: App) {
    app.config.globalProperties.$notice = notice
  },
}

export default noticePlugin
