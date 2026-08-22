import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.zxbdzh.zmusic',
  appName: 'z-music-desktop',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#EDF3F1'
  }
}

export default config
