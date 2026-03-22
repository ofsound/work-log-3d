<script setup lang="ts">
import { getShellBackgroundStyle } from '~/utils/user-settings'

const user = useCurrentUser()
const { activeSettings } = useUserSettings()

const isAuthenticated = computed(() => Boolean(user.value))
const shellBackgroundStyle = computed(() =>
  getShellBackgroundStyle(activeSettings.value.appearance.backgroundPreset),
)
</script>

<template>
  <div
    :style="shellBackgroundStyle"
    class="mx-auto h-dvh max-w-250 bg-shell text-text shadow-shell"
  >
    <HeaderBar v-if="isAuthenticated" />
    <div v-if="isAuthenticated" class="h-full pt-8">
      <slot />
    </div>
    <div v-else class="flex h-full items-center justify-center pt-8">
      <div class="text-text-subtle">Loading…</div>
    </div>
  </div>
</template>
