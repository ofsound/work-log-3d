import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

import { detectPhoneMode } from '~/utils/phone-mode'

export default defineNuxtPlugin({
  name: 'phone-firestore-transport',
  enforce: 'pre',
  setup() {
    if (!detectPhoneMode(window)) {
      return
    }

    // Configure the transport before VueFire or any client plugin opens Firestore.
    // initializeApp reuses the same app when VueFire initializes with this config.
    // iOS can delay/miss streaming listener updates: firebase/firebase-js-sdk#9789.
    const config = useRuntimeConfig().public.vuefire.config
    const firebaseApp = initializeApp(config)
    initializeFirestore(firebaseApp, { experimentalForceLongPolling: true })
  },
})
