import { useHostRuntime } from '~/composables/useHostRuntime'
import { useUserSettings } from '~/composables/useUserSettings'

export default defineNuxtPlugin(() => {
  const { desktopApi, isDesktop } = useHostRuntime()
  const { savedSettings } = useUserSettings()

  watch(
    () => savedSettings.value.workflow.countdownDefaultMinutes,
    (minutes) => {
      if (!isDesktop || !desktopApi) {
        return
      }

      void desktopApi.setCountdownDefaultMinutes(minutes).catch((error) => {
        console.warn('[worklog] unable to sync countdown default to desktop', error)
      })
    },
    { immediate: true },
  )
})
