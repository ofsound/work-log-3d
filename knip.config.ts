import type { KnipConfig } from 'knip'

/**
 * Nuxt plugin supplies default entries; we add Electron, ESLint, and scripts.
 * Vitest is picked up by the Vitest plugin (no extra entry needed).
 * `paths` matches `~/` in electron-vite and Vitest.
 * @see https://knip.dev/reference/plugins/nuxt
 */
const config: KnipConfig = {
  entry: [
    'electron/main.ts',
    'electron/preload.ts',
    'electron.vite.config.ts',
    'eslint.config.mjs',
    'scripts/**/*.mjs',
  ],
  paths: {
    '~': ['.'],
  },
  ignoreBinaries: ['eslint'],
  ignoreDependencies: [
    // Resolved by Nuxt modules; imported in app code but not direct package.json deps
    'pinia',
    'vue-router',
    'vuefire',
    // Used only from npm scripts (no direct import for knip to see)
    '@vue/test-utils',
    'vue-tsc',
  ],
  ignoreIssues: {
    'shared/worklog/**/*.ts': ['exports', 'types'],
  },
}

export default config
