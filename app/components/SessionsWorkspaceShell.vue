<script setup lang="ts">
withDefaults(
  defineProps<{
    overlayAside?: boolean
  }>(),
  {
    overlayAside: false,
  },
)
</script>

<template>
  <div class="relative flex min-h-0 flex-1 overflow-hidden">
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <slot />
      </div>
    </div>

    <div
      v-if="$slots.aside && overlayAside"
      class="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-full justify-end p-4"
    >
      <div class="pointer-events-auto flex h-full w-full max-w-108 min-w-0">
        <slot name="aside" />
      </div>
    </div>

    <slot v-else name="aside" />
  </div>
</template>
