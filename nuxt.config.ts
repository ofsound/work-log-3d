import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@pinia/nuxt', 'nuxt-vuefire'],
  fonts: {
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
  },
  typescript: {
    typeCheck: false, // use `npm run typecheck` or `npm run check`
    strict: true,
  },
  css: ['~/assets/css/main.css'],
  vite: {
    // @ts-expect-error - Tailwind Vite plugin types don't match Nuxt's Vite PluginOption
    plugins: [tailwindcss()],
  },
})
