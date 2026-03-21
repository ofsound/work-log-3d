<script setup lang="ts">
const user = useCurrentUser()

const isAuthReady = computed(() => user.value !== undefined)
</script>

<template>
  <div
    class="mx-auto h-dvh max-w-250 bg-shell bg-shell-grid bg-size-[15px_15px] text-text shadow-shell"
  >
    <HeaderBar />
    <div v-if="isAuthReady" class="h-full pt-8">
      <slot />
    </div>
    <div v-else class="flex h-full items-center justify-center pt-8">
      <div class="text-text-subtle">Loading…</div>
    </div>
  </div>
</template>
