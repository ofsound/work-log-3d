<script setup lang="ts">
import { THEME_PREFERENCES, type ThemePreference } from '~/utils/theme-mode'

const { preference, setPreference } = useThemeMode()

const optionMeta: Record<ThemePreference, { label: string; title: string }> = {
  system: { label: 'System', title: 'Use system theme' },
  light: { label: 'Light', title: 'Use light theme' },
  dark: { label: 'Dark', title: 'Use dark theme' },
}

const nextPreference = computed(() => {
  const i = THEME_PREFERENCES.indexOf(preference.value)
  return THEME_PREFERENCES[(i + 1) % THEME_PREFERENCES.length]!
})

const cycleTheme = () => {
  setPreference(nextPreference.value)
}

const currentMeta = computed(() => optionMeta[preference.value])

const buttonTitle = computed(() => {
  const next = optionMeta[nextPreference.value]
  return `${currentMeta.value.title}. Click for ${next.label.toLowerCase()} mode.`
})
</script>

<template>
  <button
    type="button"
    class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-header-muted transition-colors hover:bg-header-toggle-active hover:text-header-text"
    :aria-label="`Theme: ${currentMeta.label}`"
    :title="buttonTitle"
    @click="cycleTheme"
  >
    <svg
      v-if="preference === 'system'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
    <svg
      v-else-if="preference === 'light'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
    </svg>
  </button>
</template>
