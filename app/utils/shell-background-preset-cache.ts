import {
  isUserSettingsBackgroundPreset,
  type UserSettingsBackgroundPreset,
} from '~~/shared/worklog'

export const SHELL_BACKGROUND_USER_STORAGE_KEY_PREFIX = 'work-log-shell-bg:user:'

export interface ShellBackgroundPresetStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const getShellBackgroundPresetStorageKey = (userId: string) =>
  `${SHELL_BACKGROUND_USER_STORAGE_KEY_PREFIX}${userId}`

export const readCachedShellBackgroundPreset = (
  storage: ShellBackgroundPresetStorageLike,
  userId: string,
): UserSettingsBackgroundPreset | null => {
  const storedValue = storage.getItem(getShellBackgroundPresetStorageKey(userId))

  return isUserSettingsBackgroundPreset(storedValue) ? storedValue : null
}

export const writeCachedShellBackgroundPreset = (
  storage: ShellBackgroundPresetStorageLike,
  userId: string,
  preset: UserSettingsBackgroundPreset,
) => {
  storage.setItem(getShellBackgroundPresetStorageKey(userId), preset)
}
