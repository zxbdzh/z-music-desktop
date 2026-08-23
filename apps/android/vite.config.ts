import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@common': fileURLToPath(new URL('../../src/common', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true
  },
  build: {
    target: 'es2022',
    sourcemap: false
  }
})
