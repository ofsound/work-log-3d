import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useUserSettings } from '~/composables/useUserSettings'
import type { UserSettings } from '~~/shared/worklog'
import { areUserSettingsEqual, cloneUserSettings, getWorklogErrorMessage } from '~~/shared/worklog'

export function useSettingsDraft() {
  const { applyPreview, clearPreview, defaultSettings, saveSettings, savedSettings } =
    useUserSettings()

  const draft = ref<UserSettings>(cloneUserSettings(savedSettings.value))
  const mutationErrorMessage = ref('')
  const saveMessage = ref('')
  const isSaving = ref(false)
  const hasInitializedDraft = ref(false)

  const isDirty = computed(() => !areUserSettingsEqual(draft.value, savedSettings.value))

  const syncDraftFromSaved = (settings: UserSettings) => {
    draft.value = cloneUserSettings(settings)
  }

  const clearMessages = () => {
    mutationErrorMessage.value = ''
    saveMessage.value = ''
  }

  const handleSave = async () => {
    isSaving.value = true

    try {
      mutationErrorMessage.value = ''
      await saveSettings(draft.value)
      saveMessage.value = 'Settings saved.'
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save settings.')
      saveMessage.value = ''
    } finally {
      isSaving.value = false
    }
  }

  const handleCancel = () => {
    syncDraftFromSaved(savedSettings.value)
    clearMessages()
  }

  const handleResetFontsToDefaults = () => {
    draft.value.appearance.fontImportUrl = defaultSettings.appearance.fontImportUrl
    draft.value.appearance.fontFamilies = {
      ui: defaultSettings.appearance.fontFamilies.ui,
      data: defaultSettings.appearance.fontFamilies.data,
    }
    clearMessages()
  }

  watch(
    savedSettings,
    (nextSettings) => {
      if (!hasInitializedDraft.value || !isDirty.value) {
        syncDraftFromSaved(nextSettings)
      }

      hasInitializedDraft.value = true
    },
    {
      deep: true,
      immediate: true,
    },
  )

  watch(
    draft,
    (nextSettings) => {
      applyPreview(nextSettings)

      if (isDirty.value) {
        clearMessages()
      }
    },
    {
      deep: true,
      immediate: true,
    },
  )

  onBeforeUnmount(() => {
    clearPreview()
  })

  return {
    clearMessages,
    defaultSettings,
    draft,
    handleCancel,
    handleResetFontsToDefaults,
    handleSave,
    isDirty,
    isSaving,
    mutationErrorMessage,
    saveMessage,
    savedSettings,
  }
}
