<script setup lang="ts">
const user = useCurrentUser()

const isAuthReady = computed(() => user.value !== undefined)
</script>

<template>
  <div
    class="mx-auto h-dvh max-w-250 bg-white bg-[linear-gradient(to_right,#73737320_1px,transparent_1px),linear-gradient(to_bottom,#73737320_1px,transparent_1px)] bg-size-[15px_15px] shadow-lg shadow-black"
  >
    <HeaderBar />
    <div v-if="isAuthReady" class="h-full pt-8">
      <slot />
    </div>
    <div v-else class="flex h-full items-center justify-center pt-8">
      <div class="text-gray-500">Loading…</div>
    </div>
  </div>
</template>
