export const USER_SETTINGS_BACKGROUND_PRESETS = ['grid', 'dots', 'crosshatch', 'aurora'] as const

export type UserSettingsBackgroundPreset = (typeof USER_SETTINGS_BACKGROUND_PRESETS)[number]

export interface UserSettingsFontFamilies {
  ui: string
  data: string
  script: string
}

export interface UserSettingsAppearance {
  fontImportUrl: string
  fontFamilies: UserSettingsFontFamilies
  backgroundPreset: UserSettingsBackgroundPreset
}

export interface UserSettingsWorkflow {
  hideTags: boolean
}

export interface UserSettings {
  appearance: UserSettingsAppearance
  workflow: UserSettingsWorkflow
}

export interface PartialUserSettings {
  appearance?: {
    fontImportUrl?: string
    fontFamilies?: Partial<UserSettingsFontFamilies>
    backgroundPreset?: string
  }
  workflow?: {
    hideTags?: boolean
  }
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  appearance: {
    fontImportUrl: '',
    fontFamilies: {
      ui: "'National Park', sans-serif",
      data: "'Lato', sans-serif",
      script: "'Caveat', sans-serif",
    },
    backgroundPreset: 'grid',
  },
  workflow: {
    hideTags: false,
  },
}

const GOOGLE_FONTS_HOSTNAME = 'fonts.googleapis.com'
const googleFontsImportPattern =
  /^@import\s+url\((['"]?)(https:\/\/fonts\.googleapis\.com\/css2\?[^'")]+)\1\)\s*;?$/i

export const isUserSettingsBackgroundPreset = (
  value: string | null | undefined,
): value is UserSettingsBackgroundPreset => {
  return (
    value != null &&
    USER_SETTINGS_BACKGROUND_PRESETS.includes(value as UserSettingsBackgroundPreset)
  )
}

export const cloneUserSettings = (settings: UserSettings): UserSettings => ({
  appearance: {
    fontImportUrl: settings.appearance.fontImportUrl,
    fontFamilies: {
      ui: settings.appearance.fontFamilies.ui,
      data: settings.appearance.fontFamilies.data,
      script: settings.appearance.fontFamilies.script,
    },
    backgroundPreset: settings.appearance.backgroundPreset,
  },
  workflow: {
    hideTags: settings.workflow.hideTags,
  },
})

export const areUserSettingsEqual = (left: UserSettings, right: UserSettings) =>
  JSON.stringify(left) === JSON.stringify(right)

const normalizeRequiredFontFamily = (value: string, label: string) => {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${label} font family is required.`)
  }

  return normalized
}

export const normalizeGoogleFontsImportUrl = (value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  const importMatch = normalized.match(googleFontsImportPattern)
  const candidate = importMatch?.[2] ?? normalized

  let parsedUrl: URL

  try {
    parsedUrl = new URL(candidate)
  } catch {
    throw new Error('Google Fonts import must be a valid URL or @import rule.')
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== GOOGLE_FONTS_HOSTNAME) {
    throw new Error('Google Fonts import must use https://fonts.googleapis.com.')
  }

  if (!parsedUrl.pathname.startsWith('/css2')) {
    throw new Error('Google Fonts import must use the Google Fonts css2 endpoint.')
  }

  return parsedUrl.toString()
}

export const validateUserSettings = (input: UserSettings): UserSettings => ({
  appearance: {
    fontImportUrl: normalizeGoogleFontsImportUrl(input.appearance.fontImportUrl),
    fontFamilies: {
      ui: normalizeRequiredFontFamily(input.appearance.fontFamilies.ui, 'UI'),
      data: normalizeRequiredFontFamily(input.appearance.fontFamilies.data, 'Data'),
      script: normalizeRequiredFontFamily(input.appearance.fontFamilies.script, 'Script'),
    },
    backgroundPreset: isUserSettingsBackgroundPreset(input.appearance.backgroundPreset)
      ? input.appearance.backgroundPreset
      : (() => {
          throw new Error('Background preset is invalid.')
        })(),
  },
  workflow: {
    hideTags: Boolean(input.workflow.hideTags),
  },
})

export const resolveUserSettings = (
  input: PartialUserSettings | null | undefined,
): UserSettings => {
  if (!input) {
    return cloneUserSettings(DEFAULT_USER_SETTINGS)
  }

  try {
    return validateUserSettings({
      appearance: {
        fontImportUrl:
          input.appearance?.fontImportUrl ?? DEFAULT_USER_SETTINGS.appearance.fontImportUrl,
        fontFamilies: {
          ui:
            input.appearance?.fontFamilies?.ui ?? DEFAULT_USER_SETTINGS.appearance.fontFamilies.ui,
          data:
            input.appearance?.fontFamilies?.data ??
            DEFAULT_USER_SETTINGS.appearance.fontFamilies.data,
          script:
            input.appearance?.fontFamilies?.script ??
            DEFAULT_USER_SETTINGS.appearance.fontFamilies.script,
        },
        backgroundPreset: isUserSettingsBackgroundPreset(input.appearance?.backgroundPreset)
          ? input.appearance.backgroundPreset
          : DEFAULT_USER_SETTINGS.appearance.backgroundPreset,
      },
      workflow: {
        hideTags: input.workflow?.hideTags ?? DEFAULT_USER_SETTINGS.workflow.hideTags,
      },
    })
  } catch {
    return cloneUserSettings(DEFAULT_USER_SETTINGS)
  }
}
