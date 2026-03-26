<script setup lang="ts">
defineEmits<{
  dismissAside: []
}>()

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

    <Transition name="workspace-overlay-veil-fade">
      <div
        v-if="$slots.aside && overlayAside"
        class="pointer-events-auto absolute inset-0 z-20 bg-surface-muted/10 backdrop-blur-sm backdrop-saturate-150"
        role="presentation"
        aria-hidden="true"
        @click="$emit('dismissAside')"
      />
    </Transition>

    <div
      v-if="$slots.aside && overlayAside"
      class="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-full justify-end pt-4 pr-0 pb-4 pl-4"
    >
      <div class="pointer-events-auto flex h-full w-full max-w-108 min-w-0">
        <slot name="aside" />
      </div>
    </div>

    <slot v-else name="aside" />
  </div>
</template>

<style scoped>
.workspace-overlay-veil-fade-enter-active,
.workspace-overlay-veil-fade-leave-active {
  transition: opacity 0.25s ease;
}

.workspace-overlay-veil-fade-enter-from,
.workspace-overlay-veil-fade-leave-to {
  opacity: 0;
}
</style>
