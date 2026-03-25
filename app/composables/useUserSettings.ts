import type { Ref } from 'vue'

import { doc, getFirestore, setDoc } from 'firebase/firestore'

import type { FirebaseUserSettingsDocument } from '~/utils/worklog-firebase'
import { toUserSettings, toUserSettingsPayload } from '~/utils/worklog-firebase'
import { DEFAULT_USER_SETTINGS, cloneUserSettings, type UserSettings } from '~~/shared/worklog'

const USER_SETTINGS_DOCUMENT_ID = 'preferences'

export function useUserSettings() {
  const firebaseApp = useFirebaseApp()
  const db = getFirestore(firebaseApp)
  const currentUser = useCurrentUser()

  const previewSettings = useState<UserSettings | null>('user-settings:preview', () => null)

  const settingsDocument = computed(() => {
    const uid = currentUser.value?.uid

    return uid ? doc(db, 'users', uid, 'settings', USER_SETTINGS_DOCUMENT_ID) : null
  })

  const rawSettings = useDocument(settingsDocument, {
    ssrKey: 'user-settings-preferences',
  })

  /** True while the preferences document snapshot is still loading from Firestore. */
  const preferencesDocumentPending = computed(() => {
    const binding = rawSettings as unknown as { pending?: Ref<boolean> }

    return binding.pending?.value ?? false
  })

  const savedSettings = computed(() =>
    toUserSettings((rawSettings.value as FirebaseUserSettingsDocument | null | undefined) ?? null),
  )
  const activeSettings = computed(() => previewSettings.value ?? savedSettings.value)
  const hideTags = computed(() => activeSettings.value.workflow.hideTags)
  const isReady = computed(() => currentUser.value !== undefined)

  const applyPreview = (nextSettings: UserSettings | null) => {
    previewSettings.value = nextSettings ? cloneUserSettings(nextSettings) : null
  }

  const clearPreview = () => {
    previewSettings.value = null
  }

  const saveSettings = async (nextSettings: UserSettings) => {
    if (!settingsDocument.value) {
      throw new Error('User settings require an authenticated user.')
    }

    const payload = toUserSettingsPayload(nextSettings)

    await setDoc(settingsDocument.value, payload)
    previewSettings.value = null
  }

  return {
    activeSettings,
    applyPreview,
    clearPreview,
    defaultSettings: DEFAULT_USER_SETTINGS,
    hideTags,
    isReady,
    preferencesDocumentPending,
    rawSettings,
    saveSettings,
    savedSettings,
  }
}
