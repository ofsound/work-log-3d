<script setup lang="ts">
const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, default: undefined },
  titleId: { type: String, default: 'overlay-toast-title' },
})

const emit = defineEmits<{
  dismiss: []
  afterLeave: []
}>()

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        emit('dismiss')
      }
    }

    window.addEventListener('keydown', handler)
    onWatcherCleanup(() => window.removeEventListener('keydown', handler))
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay-toast-fade" @after-leave="emit('afterLeave')">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        @click.self="emit('dismiss')"
      >
        <div
          class="w-full max-w-sm rounded-md border border-border bg-surface-strong p-5 shadow-panel"
          role="status"
          aria-live="polite"
          :aria-labelledby="titleId"
          @click.stop
        >
          <h2 :id="titleId" class="text-lg font-bold text-text">
            {{ title }}
          </h2>
          <p v-if="message" class="mt-2 text-sm text-text-subtle">
            {{ message }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay-toast-fade-enter-active,
.overlay-toast-fade-leave-active {
  transition: opacity 0.25s ease;
}

.overlay-toast-fade-enter-from,
.overlay-toast-fade-leave-to {
  opacity: 0;
}
</style>
