<script setup lang="ts">
import type { PropType } from 'vue'

import type { ConfirmDialogVariant } from '~/composables/useConfirmDialog'

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, default: undefined },
  confirmLabel: { type: String, required: true },
  cancelLabel: { type: String, required: true },
  variant: { type: String as PropType<ConfirmDialogVariant>, required: true },
  titleId: { type: String, default: 'confirm-dialog-title' },
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmButtonClass = computed(() =>
  props.variant === 'danger'
    ? 'cursor-pointer rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90'
    : 'cursor-pointer rounded-md bg-button-primary px-3 py-1.5 text-sm font-medium text-button-primary-text hover:bg-button-primary-hover',
)

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        emit('cancel')
      }
    }

    window.addEventListener('keydown', handler)
    onWatcherCleanup(() => window.removeEventListener('keydown', handler))
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      @click.self="emit('cancel')"
    >
      <div
        class="w-full max-w-sm rounded-md border border-border bg-surface-strong p-5 shadow-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <h2 :id="titleId" class="text-lg font-bold text-text">
          {{ title }}
        </h2>
        <p v-if="message" class="mt-2 text-sm text-text-subtle">
          {{ message }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="cursor-pointer rounded-md border border-button-secondary-border px-3 py-1.5 text-sm text-button-secondary-text hover:bg-button-secondary-hover"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button type="button" :class="confirmButtonClass" @click="emit('confirm')">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
