import type { CSSProperties } from 'vue'

import type { UserSettings, UserSettingsBackgroundPreset } from '~~/shared/worklog'

export interface UserSettingsBackgroundOption {
  id: UserSettingsBackgroundPreset
  label: string
  description: string
}

export const USER_SETTINGS_BACKGROUND_OPTIONS: UserSettingsBackgroundOption[] = [
  {
    id: 'grid',
    label: 'Grid',
    description: 'The current structured shell pattern.',
  },
  {
    id: 'dots',
    label: 'Dots',
    description: 'A lighter drafting-board dot field.',
  },
  {
    id: 'crosshatch',
    label: 'Crosshatch',
    description: 'Diagonal texture with a more tactile feel.',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'A soft gradient wash for a calmer shell.',
  },
]

export const getUserSettingsBackgroundOption = (preset: UserSettingsBackgroundPreset) =>
  USER_SETTINGS_BACKGROUND_OPTIONS.find((option) => option.id === preset) ??
  USER_SETTINGS_BACKGROUND_OPTIONS[0]!

export const getShellBackgroundStyle = (preset: UserSettingsBackgroundPreset): CSSProperties => {
  switch (preset) {
    case 'dots':
      return {
        backgroundImage: 'var(--background-image-shell-dots)',
        backgroundSize: '18px 18px',
        backgroundPosition: 'center center',
      }
    case 'crosshatch':
      return {
        backgroundImage: 'var(--background-image-shell-crosshatch)',
        backgroundSize: '22px 22px',
        backgroundPosition: 'center center',
      }
    case 'aurora':
      return {
        backgroundImage: 'var(--background-image-shell-aurora)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
      }
    default:
      return {
        backgroundImage: 'var(--background-image-shell-grid)',
        backgroundSize: '15px 15px',
        backgroundPosition: 'center center',
      }
  }
}

export const getUserSettingsFontVariables = (settings: UserSettings) => ({
  '--font-sans': settings.appearance.fontFamilies.ui,
  '--font-data': settings.appearance.fontFamilies.data,
})
