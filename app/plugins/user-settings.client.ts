import { defineNuxtPlugin, watch } from '#imports'

import { getUserSettingsFontVariables } from '~/utils/user-settings'

const USER_SETTINGS_FONT_LINK_ID = 'worklog-user-font-import'

const getFontLinkElement = () => {
  let link = document.getElementById(USER_SETTINGS_FONT_LINK_ID) as HTMLLinkElement | null

  if (!link) {
    link = document.createElement('link')
    link.id = USER_SETTINGS_FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }

  return link
}

export default defineNuxtPlugin(() => {
  const { activeSettings } = useUserSettings()

  watch(
    activeSettings,
    (settings) => {
      const root = document.documentElement
      const link = getFontLinkElement()

      Object.entries(getUserSettingsFontVariables(settings)).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })

      if (settings.appearance.fontImportUrl) {
        link.href = settings.appearance.fontImportUrl
      } else {
        link.removeAttribute('href')
      }
    },
    {
      deep: true,
      immediate: true,
    },
  )
})
