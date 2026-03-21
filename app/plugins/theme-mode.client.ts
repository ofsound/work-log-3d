import { defineNuxtPlugin, useCurrentUser, watch } from '#imports'

import {
  isThemePreference,
  persistThemePreference,
  resolveThemePreference,
} from '~/utils/theme-mode'

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  const currentUser = useCurrentUser()
  const storage = window.localStorage

  let activeUserId: string | null | undefined
  let isApplyingStoredPreference = false

  watch(
    () => currentUser.value,
    (user) => {
      if (user === undefined) {
        return
      }

      activeUserId = user?.uid ?? null

      const { preference } = resolveThemePreference(storage, activeUserId)

      if (colorMode.preference !== preference) {
        isApplyingStoredPreference = true
        colorMode.preference = preference
        return
      }

      persistThemePreference(storage, activeUserId, preference)
    },
    { immediate: true },
  )

  watch(
    () => colorMode.preference,
    (preference) => {
      if (activeUserId === undefined || !isThemePreference(preference)) {
        return
      }

      persistThemePreference(storage, activeUserId, preference)

      if (isApplyingStoredPreference) {
        isApplyingStoredPreference = false
      }
    },
    { immediate: true },
  )
})
