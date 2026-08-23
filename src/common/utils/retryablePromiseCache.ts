export interface RetryablePromiseCache<T> {
  get: () => Promise<T>
  set: (value: T) => void
  reset: () => void
}

export function createRetryablePromiseCache<T>(load: () => Promise<T>): RetryablePromiseCache<T> {
  let value: T | undefined
  let hasValue = false
  let pending: Promise<T> | null = null
  let generation = 0

  return {
    get() {
      if (hasValue) return Promise.resolve(value as T)
      if (pending) return pending

      const requestGeneration = generation
      const request = load()
        .then((result) => {
          if (requestGeneration === generation) {
            value = result
            hasValue = true
          }
          return result
        })
        .finally(() => {
          if (requestGeneration === generation) pending = null
        })
      pending = request
      return request
    },
    set(nextValue) {
      generation += 1
      value = nextValue
      hasValue = true
      pending = null
    },
    reset() {
      generation += 1
      value = undefined
      hasValue = false
      pending = null
    },
  }
}
