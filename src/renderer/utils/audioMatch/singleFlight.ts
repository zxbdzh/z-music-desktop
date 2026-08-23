export interface SingleFlightLoader<T> {
  get: () => Promise<T>
  reset: () => void
}

export function createSingleFlightLoader<T>(load: () => Promise<T>): SingleFlightLoader<T> {
  let value: T | undefined
  let pending: Promise<T> | null = null
  let generation = 0

  return {
    get() {
      if (value !== undefined) return Promise.resolve(value)
      if (pending) return pending

      const requestGeneration = generation
      const request = load()
        .then((result) => {
          if (requestGeneration !== generation) {
            throw new Error('Loader was reset while the request was in flight.')
          }
          value = result
          return result
        })
        .finally(() => {
          if (pending === request) pending = null
        })

      pending = request
      return request
    },
    reset() {
      generation += 1
      value = undefined
      pending = null
    },
  }
}
