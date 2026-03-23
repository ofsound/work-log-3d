<script setup lang="ts">
import type { PropType } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import { getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

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

const daySummary = computed(() => ({
  count: props.timeBoxes.length,
  durationLabel: getTotalDurationLabel(props.timeBoxes),
}))

const projectStyle = computed(() =>
  props.project ? getProjectSoftSurfaceStyle(props.project.colors) : {},
)

const formatTime = (date: Date | null | undefined) =>
  date?.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  }) ?? ''

const getSessionTimeRange = (timeBox: TimeBox) => {
  const startLabel = formatTime(timeBox.startTime)
  const endLabel = formatTime(timeBox.endTime)

  if (!startLabel || !endLabel) {
    return 'Time unavailable'
  }

  return `${startLabel} - ${endLabel}`
}

const getSessionNotes = (timeBox: TimeBox) => {
  const trimmedNotes = timeBox.notes.trim()

  return trimmedNotes.length > 0 ? trimmedNotes : 'Untitled session'
}
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

      <div v-else class="flex flex-col gap-4 pb-4">
        <div>
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Day</div>
          <div class="mt-1 text-lg font-bold tracking-tight">{{ dayTitle }}</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <div
              class="rounded-lg bg-badge-duration px-3 py-1.5 text-sm font-bold tracking-tight text-badge-duration-text tabular-nums shadow-sm"
            >
              {{ daySummary.durationLabel }} hrs
            </div>
            <div
              class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text shadow-sm"
            >
              {{ daySummary.count }} sessions
            </div>
          </div>
        </div>

        <div
          v-if="timeBoxes.length === 0"
          class="rounded-2xl border border-dashed border-border-subtle bg-surface px-5 py-8 text-center"
        >
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">No sessions</div>
          <div class="mt-2 text-sm text-text-muted">
            This project has no sessions on the selected day.
          </div>
        </div>

        <div v-else class="flex flex-col gap-3">
          <button
            v-for="timeBox in timeBoxes"
            :key="timeBox.id"
            class="cursor-pointer rounded-2xl border px-4 py-3 text-left transition hover:brightness-97"
            :class="{
              'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                selectedSessionId === timeBox.id,
            }"
            :style="projectStyle"
            @click="emit('openSession', timeBox.id)"
          >
            <div class="text-xs font-semibold tracking-[0.14em] text-text-subtle uppercase">
              {{ getSessionTimeRange(timeBox) }}
            </div>
            <div class="mt-1 text-sm font-semibold text-text">
              {{ getSessionNotes(timeBox) }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
