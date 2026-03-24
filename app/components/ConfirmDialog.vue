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
          <AppButton size="sm" variant="secondary" @click="emit('cancel')">
            {{ cancelLabel }}
          </AppButton>
          <AppButton
            size="sm"
            :variant="variant === 'danger' ? 'danger' : 'primary'"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
