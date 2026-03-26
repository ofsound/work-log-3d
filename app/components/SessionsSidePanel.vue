<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import type { Project, TimeBox } from '~~/shared/worklog'

defineProps({
  mode: {
    type: String as PropType<'scratchpad' | 'overview' | 'session' | 'create'>,
    required: true,
  },
  sessionId: { type: String, default: undefined },
  day: { type: Object as PropType<Date | null>, default: null },
  dateKey: { type: String, default: '' },
  initialStartTime: { type: String, default: '' },
  initialEndTime: { type: String, default: '' },
  persistent: { type: Boolean, default: false },
  overlay: { type: Boolean, default: false },
  selectedSessionId: { type: String, default: '' },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
})

const emit = defineEmits(['close', 'created', 'openSession', 'showOverview', 'showScratchpad'])

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
  <ContainerCard
    as="aside"
    class="flex h-full w-full min-w-0 shrink-0 flex-col p-0"
    :class="
      overlay
        ? ''
        : 'max-w-108 rounded-none border-y-0 border-r-0 border-l border-border bg-surface-strong'
    "
    padding="compact"
    :variant="overlay ? 'overlay' : 'subtle'"
  >
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-3">
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
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
          :class="
            mode === 'overview'
              ? 'bg-header text-header-text'
              : overlay
                ? 'text-text-muted hover:bg-white/16'
                : 'text-text-muted hover:bg-surface'
          "
          @click="emit('showOverview')"
        >
          Overview
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

      <div v-if="mode === 'overview' && day" class="h-full min-w-0 overflow-y-auto pr-1">
        <DaySessionsOverviewPanel
          :day="day"
          empty-message="No sessions on the selected day."
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :show-day-summary="false"
          show-project-name
          :time-boxes="timeBoxes"
          use-project-card-styles
          @open-session="emit('openSession', $event)"
        />
      </div>

      <div v-if="mode === 'session' && sessionId" class="h-full min-w-0 overflow-y-auto pr-1">
        <TimeBox
          :id="sessionId"
          embedded-in-panel
          :opaque-surface="overlay"
          flush-top
          @deleted="emit('close')"
        />
      </div>

      <div v-else-if="mode === 'create'" class="h-full min-w-0 overflow-y-auto pr-1 pb-4">
        <TimeBoxEditor
          embedded-in-panel
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
  </ContainerCard>
</template>
