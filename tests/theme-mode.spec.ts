import {
  DEFAULT_THEME_PREFERENCE,
  THEME_ACTIVE_STORAGE_KEY,
  THEME_GUEST_STORAGE_KEY,
  getThemeStorageKey,
  persistThemePreference,
  readThemePreference,
  resolveThemePreference,
  type ThemeStorageLike,
} from '~/app/utils/theme-mode'

const createStorage = (initialValues: Record<string, string> = {}): ThemeStorageLike => {
  const values = new Map(Object.entries(initialValues))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

describe('theme mode storage', () => {
  it('uses the guest storage key when no user is signed in', () => {
    expect(getThemeStorageKey(null)).toBe(THEME_GUEST_STORAGE_KEY)
  })

  it('uses a user-specific key when a Firebase user is available', () => {
    expect(getThemeStorageKey('user-123')).toBe('work-log-theme:user:user-123')
  })

  it('prefers the scoped user preference over the shared active preference', () => {
    const storage = createStorage({
      [THEME_ACTIVE_STORAGE_KEY]: 'light',
      [getThemeStorageKey('user-123')]: 'dark',
    })

    expect(resolveThemePreference(storage, 'user-123')).toEqual({
      preference: 'dark',
      scopedKey: 'work-log-theme:user:user-123',
    })
  })

  it('falls back to the shared active preference or the default when no scoped value exists', () => {
    const activeStorage = createStorage({
      [THEME_ACTIVE_STORAGE_KEY]: 'dark',
    })

    expect(resolveThemePreference(activeStorage, 'user-123')).toEqual({
      preference: 'dark',
      scopedKey: 'work-log-theme:user:user-123',
    })

    const emptyStorage = createStorage()

    expect(resolveThemePreference(emptyStorage, null)).toEqual({
      preference: DEFAULT_THEME_PREFERENCE,
      scopedKey: THEME_GUEST_STORAGE_KEY,
    })
  })

  it('persists guest, user, and system preferences while mirroring the active key', () => {
    const storage = createStorage()

    persistThemePreference(storage, null, 'system')

    expect(readThemePreference(storage, THEME_GUEST_STORAGE_KEY)).toBe('system')
    expect(readThemePreference(storage, THEME_ACTIVE_STORAGE_KEY)).toBe('system')

    persistThemePreference(storage, 'user-123', 'dark')

    expect(readThemePreference(storage, getThemeStorageKey('user-123'))).toBe('dark')
    expect(readThemePreference(storage, THEME_ACTIVE_STORAGE_KEY)).toBe('dark')
    expect(readThemePreference(storage, THEME_GUEST_STORAGE_KEY)).toBe('system')
  })

  it('keeps separate preferences when switching between signed-in users', () => {
    const storage = createStorage()

    persistThemePreference(storage, 'user-a', 'light')
    persistThemePreference(storage, 'user-b', 'dark')

    expect(resolveThemePreference(storage, 'user-a').preference).toBe('light')
    expect(resolveThemePreference(storage, 'user-b').preference).toBe('dark')
  })
})
