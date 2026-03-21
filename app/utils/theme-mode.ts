export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const THEME_ACTIVE_STORAGE_KEY = 'work-log-theme:active'
export const THEME_GUEST_STORAGE_KEY = 'work-log-theme:guest'
export const THEME_USER_STORAGE_KEY_PREFIX = 'work-log-theme:user:'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export interface ThemeStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const isThemePreference = (value: string | null | undefined): value is ThemePreference => {
  return value != null && THEME_PREFERENCES.includes(value as ThemePreference)
}

export const getThemeStorageKey = (userId: string | null) => {
  return userId ? `${THEME_USER_STORAGE_KEY_PREFIX}${userId}` : THEME_GUEST_STORAGE_KEY
}

export const readThemePreference = (
  storage: ThemeStorageLike,
  key: string,
): ThemePreference | null => {
  const storedValue = storage.getItem(key)

  return isThemePreference(storedValue) ? storedValue : null
}

export const writeThemePreference = (
  storage: ThemeStorageLike,
  key: string,
  preference: ThemePreference,
) => {
  storage.setItem(key, preference)
}

export const resolveThemePreference = (
  storage: ThemeStorageLike,
  userId: string | null,
  fallbackPreference: ThemePreference = DEFAULT_THEME_PREFERENCE,
) => {
  const scopedKey = getThemeStorageKey(userId)
  const scopedPreference = readThemePreference(storage, scopedKey)

  if (scopedPreference) {
    return { preference: scopedPreference, scopedKey }
  }

  const activePreference = readThemePreference(storage, THEME_ACTIVE_STORAGE_KEY)

  return {
    preference: activePreference ?? fallbackPreference,
    scopedKey,
  }
}

export const persistThemePreference = (
  storage: ThemeStorageLike,
  userId: string | null,
  preference: ThemePreference,
) => {
  const scopedKey = getThemeStorageKey(userId)

  writeThemePreference(storage, scopedKey, preference)
  writeThemePreference(storage, THEME_ACTIVE_STORAGE_KEY, preference)

  return scopedKey
}
