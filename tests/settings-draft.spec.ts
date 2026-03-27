// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'

import { DEFAULT_USER_SETTINGS, cloneUserSettings } from '~~/shared/worklog'

const applyPreview = vi.fn()
const clearPreview = vi.fn()
const saveSettings = vi.fn()
const savedSettings = ref(cloneUserSettings(DEFAULT_USER_SETTINGS))

vi.mock('~/app/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    applyPreview,
    clearPreview,
    defaultSettings: cloneUserSettings(DEFAULT_USER_SETTINGS),
    saveSettings,
    savedSettings,
  }),
}))

const { useSettingsDraft } = await import('~/app/composables/useSettingsDraft')

describe('useSettingsDraft', () => {
  const mountHarness = () => {
    let state: ReturnType<typeof useSettingsDraft> | null = null

    const Harness = defineComponent({
      setup() {
        state = useSettingsDraft()
        return () => null
      },
    })

    return {
      wrapper: mount(Harness),
      getState: () => state!,
    }
  }

  beforeEach(() => {
    applyPreview.mockReset()
    clearPreview.mockReset()
    saveSettings.mockReset()
    saveSettings.mockResolvedValue(undefined)
    savedSettings.value = cloneUserSettings(DEFAULT_USER_SETTINGS)
  })

  it('applies live preview updates and resets font settings to defaults', async () => {
    const { wrapper, getState } = mountHarness()
    const state = getState()

    state.draft.value.appearance.fontImportUrl = 'https://fonts.googleapis.com/css2?family=Test'
    await nextTick()

    expect(applyPreview).toHaveBeenCalled()

    state.draft.value.appearance.fontImportUrl = 'https://fonts.googleapis.com/css2?family=Other'
    state.draft.value.appearance.fontFamilies.ui = 'Custom UI'

    state.handleResetFontsToDefaults()

    expect(state.draft.value.appearance.fontImportUrl).toBe(
      DEFAULT_USER_SETTINGS.appearance.fontImportUrl,
    )
    expect(state.draft.value.appearance.fontFamilies.ui).toBe(
      DEFAULT_USER_SETTINGS.appearance.fontFamilies.ui,
    )

    wrapper.unmount()
    expect(clearPreview).toHaveBeenCalled()
  })

  it('saves through the shared user settings service', async () => {
    const { wrapper, getState } = mountHarness()
    const state = getState()

    state.draft.value.workflow.hideTags = true
    await state.handleSave()

    expect(saveSettings).toHaveBeenCalledWith(state.draft.value)
    expect(state.saveMessage.value).toBe('Settings saved.')

    wrapper.unmount()
  })
})
