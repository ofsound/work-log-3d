import { resolve } from 'node:path'

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
      },
      outDir: 'dist-electron/main',
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '~': resolve(__dirname),
        '~~': resolve(__dirname),
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
      },
      outDir: 'dist-electron/preload',
      rollupOptions: {
        output: {
          entryFileNames: 'preload.cjs',
          format: 'cjs',
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '~': resolve(__dirname),
        '~~': resolve(__dirname),
      },
    },
  },
})
