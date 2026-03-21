import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'

const isElectronBuild = process.env.NUXT_ELECTRON_BUILD === 'true'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: isElectronBuild ? false : true,
  app: isElectronBuild
    ? {
        baseURL: './',
        buildAssetsDir: 'assets/',
      }
    : undefined,
  modules: [
    '@nuxt/eslint',
    ...(isElectronBuild ? [] : ['@nuxt/fonts']),
    '@pinia/nuxt',
    'nuxt-vuefire',
  ],
  fonts: isElectronBuild
    ? undefined
    : {
        families: [
          {
            name: 'National Park',
            provider: 'google',
            weights: ['200 800'],
            subsets: ['latin'],
          },
          {
            name: 'Lato',
            provider: 'google',
            weights: [100, 300, 400, 700, 900],
            styles: ['normal', 'italic'],
            subsets: ['latin'],
          },
          {
            name: 'Caveat',
            provider: 'google',
            weights: ['400 700'],
            subsets: ['latin'],
          },
        ],
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
        'firebase-admin/auth': resolve(
          process.cwd(),
          'node_modules/firebase-admin/lib/esm/auth/index.js',
        ),
      },
    },
  },
})
