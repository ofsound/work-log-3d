// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

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

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () => currentUser,
  useFirebaseAuth: () => ({ id: 'auth' }),
  useRouter: () => ({ push: routerPush }),
}

vi.mock('firebase/auth', () => ({
  signOut,
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
          ContainerCard,
        },
      },
    })

    expect(wrapper.text()).toContain('Personal workspace')
    expect(wrapper.text()).toContain('Fonts and shell')
    expect(wrapper.text()).toContain('Timer completion sound')
    expect(wrapper.text()).toContain('Project-first mode')
    expect(wrapper.text()).toContain('Work Log 0.0.0-test')
  })
})
