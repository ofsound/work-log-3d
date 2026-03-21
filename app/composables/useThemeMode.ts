import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCES,
  isThemePreference,
  type ThemePreference,
} from '~/utils/theme-mode'

export function useThemeMode() {
  const colorMode = useColorMode()

  const preference = computed<ThemePreference>({
    get() {
      return isThemePreference(colorMode.preference)
        ? colorMode.preference
        : DEFAULT_THEME_PREFERENCE
    },
    set(nextPreference) {
      colorMode.preference = nextPreference
    },
  })

  const resolvedPreference = computed<Exclude<ThemePreference, 'system'>>(() => {
    return colorMode.value === 'dark' ? 'dark' : 'light'
  })

  const setPreference = (nextPreference: ThemePreference) => {
    preference.value = nextPreference
  }

  return {
    preference,
    preferences: THEME_PREFERENCES,
    resolvedPreference,
    setPreference,
  }
}
