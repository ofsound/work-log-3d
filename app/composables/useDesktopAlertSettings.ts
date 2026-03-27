import type { ComputedRef } from 'vue'

import { computed, onMounted, ref, watch } from 'vue'

import { useHostRuntime } from '~/composables/useHostRuntime'
import type {
  UserSettings,
  DesktopAlertSoundState,
  UserSettingsTrayShortcut,
} from '~~/shared/worklog'
import { getWorklogErrorMessage } from '~~/shared/worklog'

export interface UseDesktopAlertSettingsOptions {
  savedSettings: ComputedRef<UserSettings>
}

/** Plain JSON so Electron IPC can structured-clone (Vue proxies are not clone-safe). */
const cloneTrayShortcutsForDesktop = (
  shortcuts: UserSettingsTrayShortcut[],
): UserSettingsTrayShortcut[] => JSON.parse(JSON.stringify(shortcuts))

export function useDesktopAlertSettings(options: UseDesktopAlertSettingsOptions) {
  const { desktopApi, isDesktop } = useHostRuntime()

  const desktopAlertState = ref<DesktopAlertSoundState | null>(null)
  const desktopAlertMessage = ref('')
  const isLoadingDesktopAlert = ref(false)
  const isMutatingDesktopAlert = ref(false)

  const hasCustomDesktopAlertSound = computed(() => desktopAlertState.value?.source === 'custom')

  const loadDesktopAlertState = async () => {
    if (!isDesktop || !desktopApi) {
      desktopAlertState.value = null
      return
    }

    isLoadingDesktopAlert.value = true

    try {
      desktopAlertState.value = await desktopApi.getAlertSound()
      desktopAlertMessage.value = ''
    } catch (error) {
      desktopAlertMessage.value = getWorklogErrorMessage(
        error,
        'Unable to load the desktop alert sound.',
      )
    } finally {
      isLoadingDesktopAlert.value = false
    }
  }

  const runDesktopAlertAction = async (
    action: () => Promise<DesktopAlertSoundState | undefined>,
    successMessage = '',
    actionOptions?: { transientNotification?: boolean },
  ) => {
    if (!desktopApi) {
      return
    }

    isMutatingDesktopAlert.value = true

    const transient = actionOptions?.transientNotification === true

    if (transient && successMessage) {
      desktopAlertMessage.value = successMessage
    }

    let clearTransientAfterSuccess = false

    try {
      const nextState = await action()

      if (nextState) {
        desktopAlertState.value = nextState
      }

      if (!transient) {
        desktopAlertMessage.value = successMessage
      } else {
        clearTransientAfterSuccess = true
      }
    } catch (error) {
      desktopAlertMessage.value = getWorklogErrorMessage(
        error,
        'Unable to update the desktop alert sound.',
      )
    } finally {
      isMutatingDesktopAlert.value = false

      if (clearTransientAfterSuccess) {
        desktopAlertMessage.value = ''
      }
    }
  }

  watch(
    () => options.savedSettings.value.desktop.trayShortcuts,
    (shortcuts) => {
      if (!isDesktop || !desktopApi) {
        return
      }

      void desktopApi.setTrayShortcuts(cloneTrayShortcutsForDesktop(shortcuts)).catch((error) => {
        console.warn('[worklog] unable to sync tray shortcuts', error)
      })
    },
    {
      deep: true,
      immediate: true,
    },
  )

  onMounted(() => {
    void loadDesktopAlertState()
  })

  return {
    desktopAlertMessage,
    desktopAlertState,
    desktopApi,
    hasCustomDesktopAlertSound,
    isDesktop,
    isLoadingDesktopAlert,
    isMutatingDesktopAlert,
    loadDesktopAlertState,
    runDesktopAlertAction,
  }
}
