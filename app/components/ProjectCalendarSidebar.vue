<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import type { Project, TimeBox } from '~~/shared/worklog'

const props = defineProps({
  day: { type: Date, required: true },
  mode: { type: String as PropType<'day' | 'session'>, required: true },
  project: { type: Object as PropType<Project | null>, default: null },
  selectedSessionId: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
})

const emit = defineEmits<{
  backToDay: []
  close: []
  openSession: [sessionId: string]
}>()

const dayTitle = computed(() =>
  props.day.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)

const projectById = computed(() =>
  props.project ? ({ [props.project.id]: props.project } as Record<string, Project>) : {},
)
</script>

<template>
  <aside
    class="flex h-full w-full max-w-108 shrink-0 flex-col border-l border-border bg-surface-strong shadow-panel"
  >
    <div class="flex shrink-0 items-center justify-between gap-2 px-3 py-3">
      <button
        v-if="mode === 'session'"
        type="button"
        class="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-text-subtle hover:bg-surface hover:text-text"
        @click="emit('backToDay')"
      >
        Back
      </button>
      <div v-else />

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
        <div class="pb-3">
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Session</div>
          <div class="mt-1 text-lg font-bold tracking-tight">{{ dayTitle }}</div>
        </div>
        <TimeBox :id="sessionId" flush-top @deleted="emit('close')" />
      </div>

      <DaySessionsOverviewPanel
        v-else
        :day="day"
        empty-message="This project has no sessions on the selected day."
        :project-by-id="projectById"
        :selected-session-id="selectedSessionId"
        :time-boxes="timeBoxes"
        :use-project-card-styles="Boolean(project)"
        @open-session="emit('openSession', $event)"
      />
    </div>
  </aside>
</template>
