import {
  getShellBackgroundPresetStorageKey,
  readCachedShellBackgroundPreset,
  writeCachedShellBackgroundPreset,
  type ShellBackgroundPresetStorageLike,
} from '~/utils/shell-background-preset-cache'

const createStorage = (
  initialValues: Record<string, string> = {},
): ShellBackgroundPresetStorageLike => {
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

describe('shell background preset cache', () => {
  it('uses a user-specific storage key', () => {
    expect(getShellBackgroundPresetStorageKey('user-abc')).toBe('work-log-shell-bg:user:user-abc')
  })

  it('returns null for missing or invalid stored values', () => {
    const storage = createStorage()

    expect(readCachedShellBackgroundPreset(storage, 'user-abc')).toBeNull()

    storage.setItem(getShellBackgroundPresetStorageKey('user-abc'), 'not-a-preset')
    expect(readCachedShellBackgroundPreset(storage, 'user-abc')).toBeNull()
  })

  it('round-trips a valid preset', () => {
    const storage = createStorage()

    writeCachedShellBackgroundPreset(storage, 'user-abc', 'aurora')

    expect(readCachedShellBackgroundPreset(storage, 'user-abc')).toBe('aurora')
  })

  it('keeps separate presets per signed-in user', () => {
    const storage = createStorage()

    writeCachedShellBackgroundPreset(storage, 'user-a', 'mist')
    writeCachedShellBackgroundPreset(storage, 'user-b', 'dusk')

    expect(readCachedShellBackgroundPreset(storage, 'user-a')).toBe('mist')
    expect(readCachedShellBackgroundPreset(storage, 'user-b')).toBe('dusk')
  })
})
