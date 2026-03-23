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
  overlay: { type: Boolean, default: false },
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
    class="flex h-full w-full min-w-0 shrink-0 flex-col"
    :class="
      overlay
        ? 'rounded-3xl border border-white/20 bg-surface/42 shadow-panel backdrop-blur-lg'
        : 'max-w-108 border-l border-border bg-surface-strong shadow-panel'
    "
  >
    <div
      v-if="!persistent || mode === 'session' || mode === 'create'"
      class="flex shrink-0 items-center justify-between gap-3 px-3 py-3"
      :class="overlay ? 'border-b border-white/12 bg-white/10' : 'border-b border-border'"
    >
      <div v-if="persistent" class="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
          :class="
            mode === 'scratchpad'
              ? 'bg-header text-header-text'
              : overlay
                ? 'text-text-muted hover:bg-white/16'
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
        class="cursor-pointer rounded-md p-2 text-text-subtle hover:text-text"
        :class="overlay ? 'hover:bg-white/16' : 'hover:bg-surface'"
        aria-label="Close"
        @click="emit('close')"
      >
        <CloseIcon />
      </button>
    </div>

    <div class="min-h-0 min-w-0 flex-1 px-4 pt-4 pb-4">
      <div v-if="persistent" v-show="mode === 'scratchpad'" class="h-full min-h-0 overflow-hidden">
        <DailyScratchpadPanel
          ref="scratchpadPanelRef"
          :active="mode === 'scratchpad'"
          :date-key="dateKey"
        />
      </div>

      <div v-if="mode === 'session' && sessionId" class="h-full min-w-0 overflow-y-auto pr-1">
        <TimeBox :id="sessionId" :opaque-surface="overlay" flush-top @deleted="emit('close')" />
      </div>

      <div v-else-if="mode === 'create'" class="h-full min-w-0 overflow-y-auto pr-1 pb-4">
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
