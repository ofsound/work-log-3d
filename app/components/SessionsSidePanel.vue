<script setup lang="ts">
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

defineProps({
  mode: { type: String as PropType<'scratchpad' | 'session' | 'create'>, required: true },
  sessionId: { type: String, default: undefined },
  dateKey: { type: String, default: '' },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
  persistent: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created', 'showScratchpad'])

const scratchpadPanelRef = ref<{ flushPendingChanges: () => Promise<void> } | null>(null)

const handleCreated = (sessionId: string) => {
  emit('created', sessionId)
}

const flushScratchpad = async () => {
  await scratchpadPanelRef.value?.flushPendingChanges()
}

defineExpose({
  flushScratchpad,
})
</script>

<template>
  <aside
    class="flex h-full w-full max-w-108 shrink-0 flex-col border-l border-border bg-surface-strong shadow-panel"
  >
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-3">
      <div v-if="persistent" class="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
          :class="
            mode === 'scratchpad'
              ? 'bg-header text-header-text'
              : 'text-text-muted hover:bg-surface'
          "
          @click="emit('showScratchpad')"
        >
          Scratchpad
        </button>
        <button
          v-if="mode === 'session' || mode === 'create'"
          type="button"
          class="rounded-lg bg-header px-3 py-1.5 text-sm font-semibold text-header-text"
        >
          {{ mode === 'session' ? 'Session' : 'New Session' }}
        </button>
      </div>

      <button
        v-if="!persistent"
        type="button"
        class="cursor-pointer rounded-md p-2 text-text-subtle hover:bg-surface hover:text-text"
        aria-label="Close"
        @click="emit('close')"
      >
        <CloseIcon />
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-4">
      <div v-if="persistent" v-show="mode === 'scratchpad'" class="h-full">
        <DailyScratchpadPanel
          ref="scratchpadPanelRef"
          :active="mode === 'scratchpad'"
          :date-key="dateKey"
        />
      </div>

      <div v-if="mode === 'session' && sessionId">
        <TimeBox :id="sessionId" flush-top @deleted="emit('close')" />
      </div>

      <div v-else-if="mode === 'create'" class="pb-4">
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
