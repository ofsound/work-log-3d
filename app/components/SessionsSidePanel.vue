<script setup lang="ts">
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

defineProps({
  mode: { type: String as PropType<'session' | 'create'>, required: true },
  sessionId: { type: String, default: undefined },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
})

const emit = defineEmits(['close', 'created'])

const handleCreated = (sessionId: string) => {
  emit('created', sessionId)
}
</script>

<template>
  <aside
    class="flex h-full w-full max-w-108 shrink-0 flex-col border-l border-border bg-surface-strong shadow-panel"
  >
    <div class="flex shrink-0 items-center justify-end px-3 py-3">
      <button
        type="button"
        class="cursor-pointer rounded-md p-2 text-text-subtle hover:bg-surface hover:text-text"
        aria-label="Close"
        @click="emit('close')"
      >
        <CloseIcon />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-4">
      <div v-if="mode === 'session' && sessionId">
        <TimeBox :id="sessionId" flush-top @deleted="emit('close')" />
      </div>

      <div v-else class="pb-4">
        <TimeBoxEditor
          :initial-start-time="initialStartTime"
          :initial-end-time="initialEndTime"
          :reset-after-create="false"
          :show-create-cancel="true"
          create-button-label="Save Session"
          @saved="handleCreated"
          @toggle-editor="emit('close')"
        />
      </div>
    </div>
  </aside>
</template>
