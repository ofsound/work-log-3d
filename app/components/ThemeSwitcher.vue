<script setup lang="ts">
import type { ThemePreference } from '~/utils/theme-mode'

const { preference, setPreference } = useThemeMode()

const options: Array<{ id: ThemePreference; label: string; title: string }> = [
  { id: 'system', label: 'System', title: 'Use system theme' },
  { id: 'light', label: 'Light', title: 'Use light theme' },
  { id: 'dark', label: 'Dark', title: 'Use dark theme' },
]
</script>

<template>
  <div
    class="inline-flex items-center gap-0.5 rounded-full px-1"
    aria-label="Theme mode"
    role="group"
  >
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      :class="
        preference === option.id
          ? 'bg-header-toggle-active text-header-text shadow-control'
          : 'text-header-muted hover:bg-header-toggle-active hover:text-header-text'
      "
      class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors"
      :aria-label="option.label"
      :aria-pressed="preference === option.id"
      :title="option.title"
      @click="setPreference(option.id)"
    >
      <svg
        v-if="option.id === 'system'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        class="h-4 w-4"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <svg
        v-else-if="option.id === 'light'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        class="h-4 w-4"
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
        class="h-4 w-4"
      >
        <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />
      </svg>
    </button>
  </div>
</template>
