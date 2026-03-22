<script setup lang="ts">
import { newTimeboxIconSvg } from '~~/shared/icons/newTimeboxIcon'

const { hideTags } = useUserSettings()
</script>

<template>
  <div
    class="fixed z-100 flex w-full items-center gap-3 bg-header px-4 py-2 tracking-wide text-header-text"
  >
    <NuxtLink to="/" class="font-bold hover:underline">WORK LOG</NuxtLink>
    <div>/</div>
    <NuxtLink
      to="/new"
      class="flex items-center opacity-80 transition-opacity hover:opacity-100"
      title="New Timebox (Classic)"
    >
      <!-- Static markup from shared/icons/newTimeboxIcon (same source as Electron tray) -->
      <!-- eslint-disable vue/no-v-html -->
      <span
        class="inline-flex h-5 w-5 shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        aria-hidden="true"
        v-html="newTimeboxIconSvg()"
      />
      <!-- eslint-enable vue/no-v-html -->
    </NuxtLink>
    <div>/</div>
    <NuxtLink to="/projects" class="hover:underline">Projects</NuxtLink>
    <template v-if="!hideTags">
      <div>/</div>
      <NuxtLink to="/tags" class="hover:underline">Tags</NuxtLink>
    </template>
    <div>/</div>
    <NuxtLink to="/sessions" class="hover:underline">Sessions</NuxtLink>
    <div>/</div>
    <NuxtLink to="/reports" class="hover:underline">Reports</NuxtLink>
    <div class="ml-auto flex items-center gap-4">
      <ThemeSwitcher />
      <NuxtLink
        to="/settings"
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-header-muted transition-colors hover:bg-header-toggle-active hover:text-header-text"
        aria-label="Settings"
        title="Settings"
      >
        <svg
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
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
          />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>
