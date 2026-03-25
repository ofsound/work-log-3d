// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import AppButton from '~/app/components/AppButton.vue'
import AppField from '~/app/components/AppField.vue'
import AppFieldLabel from '~/app/components/AppFieldLabel.vue'
import AppSelect from '~/app/components/AppSelect.vue'
import AppTextInput from '~/app/components/AppTextInput.vue'
import AppTextarea from '~/app/components/AppTextarea.vue'
import AppToggleChip from '~/app/components/AppToggleChip.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import { DEFAULT_USER_SETTINGS, cloneUserSettings } from '~~/shared/worklog'

const routerPush = vi.fn()
const saveSettings = vi.fn()
const signOut = vi.fn()
const applyPreview = vi.fn()
const clearPreview = vi.fn()

const currentUser = ref({
  displayName: 'Casey',
  email: 'casey@example.com',
  photoURL: '',
  uid: 'user-1',
})

const savedSettings = ref(cloneUserSettings(DEFAULT_USER_SETTINGS))

  ; (globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
    useCurrentUser: () => currentUser,
    useFirebaseAuth: () => ({ id: 'auth' }),
    useFirestoreCollections: () => ({
      projectsCollection: ref({ id: 'projects' }),
      tagsCollection: ref({ id: 'tags' }),
    }),
    useRouter: () => ({ push: routerPush }),
  }

vi.mock('firebase/auth', () => ({
  signOut,
}))

vi.mock('vuefire', () => ({
  useCollection: () => ref([]),
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    projectsCollection: ref({ id: 'projects' }),
    tagsCollection: ref({ id: 'tags' }),
  }),
}))

vi.mock('~/composables/useHostRuntime', () => ({
  useHostRuntime: () => ({
    desktopApi: null,
    isDesktop: false,
  }),
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    applyPreview,
    clearPreview,
    defaultSettings: cloneUserSettings(DEFAULT_USER_SETTINGS),
    saveSettings,
    savedSettings,
  }),
}))

const { default: SettingsPage } = await import('~/app/pages/settings.vue')

describe('settings page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    saveSettings.mockReset()
    saveSettings.mockResolvedValue(undefined)
    signOut.mockReset()
    signOut.mockResolvedValue(undefined)
    applyPreview.mockReset()
    clearPreview.mockReset()
    savedSettings.value = cloneUserSettings(DEFAULT_USER_SETTINGS)
  })

  it('renders the major ContainerCard-backed settings sections', () => {
    const wrapper = mount(SettingsPage, {
      global: {
        components: {
          AppButton,
          AppField,
          AppFieldLabel,
          AppSelect,
          AppTextInput,
          AppTextarea,
          AppToggleChip,
          ContainerCard,
        },
      },
    })

    expect(wrapper.text()).toContain('User Settings')
    expect(wrapper.text()).toContain('Google Fonts import')
    expect(wrapper.text()).toContain('Desktop app')
    expect(wrapper.text()).toContain(
      'Open the desktop app on this device to import a local sound file or manage tray shortcuts.',
    )
    expect(wrapper.text()).toContain('Project-only mode')
    expect(wrapper.text()).toContain('Work Log 0.0.0-test')
  })
})
