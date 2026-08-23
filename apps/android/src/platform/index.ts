import type { App, InjectionKey } from 'vue'
import { inject } from 'vue'
import type { PlatformServices } from './contracts'

export * from './contracts'
export { createUnavailablePlatform } from './unavailable'

export const platformKey: InjectionKey<PlatformServices> = Symbol('z-music-desktop.platform')

export function providePlatform(app: App, services: PlatformServices): void {
  app.provide(platformKey, services)
}

export function usePlatform(): PlatformServices {
  const services = inject(platformKey)
  if (!services) throw new Error('Platform services have not been installed.')
  return services
}
