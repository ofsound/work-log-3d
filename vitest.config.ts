import { resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '#app', replacement: resolve(__dirname, 'tests/mocks/nuxt-app.ts') },
      { find: '#imports', replacement: resolve(__dirname, 'tests/mocks/nuxt-imports.ts') },
      { find: /^~\/utils\/(.*)$/, replacement: `${resolve(__dirname, 'app/utils')}/$1` },
      {
        find: /^~\/composables\/(.*)$/,
        replacement: `${resolve(__dirname, 'app/composables')}/$1`,
      },
      { find: /^~\/components\/(.*)$/, replacement: `${resolve(__dirname, 'app/components')}/$1` },
      { find: /^~\/icons\/(.*)$/, replacement: `${resolve(__dirname, 'app/icons')}/$1` },
      { find: /^~\/stores\/(.*)$/, replacement: `${resolve(__dirname, 'app/stores')}/$1` },
      { find: /^~\/assets\/(.*)$/, replacement: `${resolve(__dirname, 'app/assets')}/$1` },
      { find: /^~~\/(.*)$/, replacement: `${resolve(__dirname)}/$1` },
      { find: '@', replacement: resolve(__dirname, 'app') },
      { find: '~', replacement: resolve(__dirname) },
    ],
  },
  test: {
    exclude: ['tests/firestore-rules.spec.ts'],
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
  },
})
