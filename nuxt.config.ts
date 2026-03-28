import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

const isElectronBuild = process.env.NUXT_ELECTRON_BUILD === 'true'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as {
  version: string
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: {
    public: {
      appVersion: packageJson.version,
    },
  },
  devtools: { enabled: true },
  ssr: isElectronBuild ? false : true,
  app: isElectronBuild
    ? {
        baseURL: '/',
        buildAssetsDir: 'assets/',
      }
    : undefined,
  modules: ['@nuxt/eslint', '@nuxtjs/color-mode', 'nuxt-vuefire'],
  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system',
    storage: 'localStorage',
    storageKey: 'work-log-theme:active',
  },
  vuefire: {
    auth: { enabled: true },
    config: {
      apiKey: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_API_KEY ?? '',
      authDomain: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_AUTH_DOMAIN ?? '',
      projectId: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_PROJECT_ID ?? '',
      storageBucket: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_MESSAGING_SENDER_ID ?? '',
      appId: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_APP_ID ?? '',
    },
    admin: isElectronBuild
      ? undefined
      : {
          options: {
            projectId: process.env.NUXT_PUBLIC_VUEFIRE_CONFIG_PROJECT_ID ?? '',
          },
        },
  },
  typescript: {
    typeCheck: false, // use `npm run typecheck` or `npm run check`
    strict: true,
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Workaround: nuxt-vuefire marks firebase-admin as optional peer dep; on Vercel build
        // the resolution can return a stub. Force resolution to the real package.
        'firebase-admin/app': resolve(
          process.cwd(),
          'node_modules/firebase-admin/lib/esm/app/index.js',
        ),
        'firebase-admin/auth': resolve(
          process.cwd(),
          'node_modules/firebase-admin/lib/esm/auth/index.js',
        ),
        'firebase-admin/firestore': resolve(
          process.cwd(),
          'node_modules/firebase-admin/lib/esm/firestore/index.js',
        ),
      },
    },
  },
})
