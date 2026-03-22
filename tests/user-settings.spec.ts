import {
  DEFAULT_USER_SETTINGS,
  resolveUserSettings,
  validateUserSettingsInput,
} from '~~/shared/worklog'

describe('user settings', () => {
  it('normalizes google fonts imports and trims family names', () => {
    const settings = validateUserSettingsInput({
      appearance: {
        fontImportUrl:
          "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap');",
        fontFamilies: {
          ui: "  'IBM Plex Sans', sans-serif  ",
          data: "  'IBM Plex Mono', monospace ",
          script: "  'Caveat', cursive ",
        },
        backgroundPreset: 'aurora',
      },
      workflow: {
        hideTags: true,
      },
    })

    expect(settings.appearance.fontImportUrl).toBe(
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap',
    )
    expect(settings.appearance.fontFamilies.ui).toBe("'IBM Plex Sans', sans-serif")
    expect(settings.workflow.hideTags).toBe(true)
  })

  it('falls back to defaults when stored settings are incomplete', () => {
    expect(
      resolveUserSettings({
        appearance: {
          fontFamilies: {
            ui: "'IBM Plex Sans', sans-serif",
          },
        },
      }),
    ).toEqual({
      appearance: {
        fontImportUrl: '',
        fontFamilies: {
          ui: "'IBM Plex Sans', sans-serif",
          data: DEFAULT_USER_SETTINGS.appearance.fontFamilies.data,
          script: DEFAULT_USER_SETTINGS.appearance.fontFamilies.script,
        },
        backgroundPreset: 'grid',
      },
      workflow: {
        hideTags: false,
      },
    })
  })

  it('rejects non-google fonts imports', () => {
    expect(() =>
      validateUserSettingsInput({
        appearance: {
          ...DEFAULT_USER_SETTINGS.appearance,
          fontImportUrl: 'https://example.com/font.css',
        },
        workflow: {
          hideTags: false,
        },
      }),
    ).toThrow('Google Fonts import must use https://fonts.googleapis.com.')
  })
})
