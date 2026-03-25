export const USER_SETTINGS_BACKGROUND_PRESETS = ['grid', 'dots', 'crosshatch', 'aurora'] as const

export type UserSettingsBackgroundPreset = (typeof USER_SETTINGS_BACKGROUND_PRESETS)[number]
export const USER_SETTINGS_TRAY_SHORTCUT_TIMER_MODES = ['countup', 'countdown'] as const

export type UserSettingsTrayShortcutTimerMode =
  (typeof USER_SETTINGS_TRAY_SHORTCUT_TIMER_MODES)[number]

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

/** Upper bound for `countdownDefaultMinutes` (24 hours). */
export const USER_SETTINGS_COUNTDOWN_DEFAULT_MAX_MINUTES = 24 * 60

export const DEFAULT_COUNTDOWN_DEFAULT_MINUTES = 30

export interface UserSettingsWorkflow {
  hideTags: boolean
  /** Last chosen idle countdown duration for the new time box timer (minutes). */
  countdownDefaultMinutes: number
}

export interface UserSettingsTrayShortcut {
  id: string
  label: string
  timerMode: UserSettingsTrayShortcutTimerMode
  durationMinutes: number | null
  project: string
  tags: string[]
}

export interface UserSettingsDesktop {
  trayShortcuts: UserSettingsTrayShortcut[]
}

export interface UserSettings {
  appearance: UserSettingsAppearance
  workflow: UserSettingsWorkflow
  desktop: UserSettingsDesktop
}

export interface PartialUserSettingsTrayShortcut {
  id?: string
  label?: string
  timerMode?: string
  durationMinutes?: number | null
  project?: string
  tags?: string[]
}

export interface PartialUserSettings {
  appearance?: {
    fontImportUrl?: string
    fontFamilies?: Partial<UserSettingsFontFamilies>
    backgroundPreset?: string
  }
  workflow?: {
    hideTags?: boolean
    countdownDefaultMinutes?: number
  }
  desktop?: {
    trayShortcuts?: PartialUserSettingsTrayShortcut[]
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
    countdownDefaultMinutes: DEFAULT_COUNTDOWN_DEFAULT_MINUTES,
  },
  desktop: {
    trayShortcuts: [],
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

export const isUserSettingsTrayShortcutTimerMode = (
  value: string | null | undefined,
): value is UserSettingsTrayShortcutTimerMode => {
  return (
    value != null &&
    USER_SETTINGS_TRAY_SHORTCUT_TIMER_MODES.includes(value as UserSettingsTrayShortcutTimerMode)
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
    countdownDefaultMinutes: settings.workflow.countdownDefaultMinutes,
  },
  desktop: {
    trayShortcuts: settings.desktop.trayShortcuts.map((shortcut) => ({
      id: shortcut.id,
      label: shortcut.label,
      timerMode: shortcut.timerMode,
      durationMinutes: shortcut.durationMinutes,
      project: shortcut.project,
      tags: [...shortcut.tags],
    })),
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

const normalizeOptionalEntityId = (value: string | null | undefined) => value?.trim() ?? ''

const normalizeOptionalEntityIds = (value: string[] | null | undefined) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)))

const normalizeShortcutId = (value: string | null | undefined, index: number) => {
  const normalized = value?.trim()

  return normalized || `tray-shortcut-${index + 1}`
}

const normalizeShortcutLabel = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? ''

  if (!normalized) {
    throw new Error('Tray shortcut label is required.')
  }

  return normalized
}

const normalizeShortcutDurationMinutes = (
  value: number | null | undefined,
  timerMode: UserSettingsTrayShortcutTimerMode,
): number | null => {
  if (timerMode === 'countup') {
    return null
  }

  const durationMinutes = value ?? Number.NaN

  if (
    !Number.isFinite(durationMinutes) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  ) {
    throw new Error('Countdown duration must be a whole number of minutes.')
  }

  return durationMinutes
}

const normalizeUserSettingsTrayShortcut = (
  shortcut: PartialUserSettingsTrayShortcut | UserSettingsTrayShortcut,
  index: number,
): UserSettingsTrayShortcut => {
  const timerMode = isUserSettingsTrayShortcutTimerMode(shortcut.timerMode)
    ? shortcut.timerMode
    : 'countup'

  return {
    id: normalizeShortcutId(shortcut.id, index),
    label: normalizeShortcutLabel(shortcut.label),
    timerMode,
    durationMinutes: normalizeShortcutDurationMinutes(shortcut.durationMinutes, timerMode),
    project: normalizeOptionalEntityId(shortcut.project),
    tags: normalizeOptionalEntityIds(shortcut.tags),
  }
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

export const validateUserSettingsTrayShortcuts = (
  shortcuts: readonly UserSettingsTrayShortcut[],
): UserSettingsTrayShortcut[] =>
  shortcuts.map((shortcut, index) => normalizeUserSettingsTrayShortcut(shortcut, index))

export const normalizeCountdownDefaultMinutes = (value: unknown): number => {
  if (value === undefined || value === null) {
    return DEFAULT_COUNTDOWN_DEFAULT_MINUTES
  }

  const raw = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) {
    return DEFAULT_COUNTDOWN_DEFAULT_MINUTES
  }

  return Math.min(Math.max(1, raw), USER_SETTINGS_COUNTDOWN_DEFAULT_MAX_MINUTES)
}

export const resolveUserSettingsTrayShortcuts = (
  shortcuts: readonly PartialUserSettingsTrayShortcut[] | null | undefined,
): UserSettingsTrayShortcut[] => {
  if (!Array.isArray(shortcuts)) {
    return []
  }

  const resolved: UserSettingsTrayShortcut[] = []

  shortcuts.forEach((shortcut, index) => {
    try {
      resolved.push(normalizeUserSettingsTrayShortcut(shortcut, index))
    } catch {
      // Ignore malformed saved shortcuts so the rest of settings can still load.
    }
  })

  return resolved
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
    hideTags: Boolean(input.workflow?.hideTags ?? DEFAULT_USER_SETTINGS.workflow.hideTags),
    countdownDefaultMinutes: normalizeCountdownDefaultMinutes(
      input.workflow?.countdownDefaultMinutes,
    ),
  },
  desktop: {
    trayShortcuts: validateUserSettingsTrayShortcuts(
      input.desktop?.trayShortcuts ?? DEFAULT_USER_SETTINGS.desktop.trayShortcuts,
    ),
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
        countdownDefaultMinutes: normalizeCountdownDefaultMinutes(
          input.workflow?.countdownDefaultMinutes,
        ),
      },
      desktop: {
        trayShortcuts: resolveUserSettingsTrayShortcuts(input.desktop?.trayShortcuts),
      },
    })
  } catch {
    return cloneUserSettings(DEFAULT_USER_SETTINGS)
  }
}
