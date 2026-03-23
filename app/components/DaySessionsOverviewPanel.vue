<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import { getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const props = defineProps({
  day: { type: Date, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  selectedSessionId: { type: String, default: '' },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  showProjectName: { type: Boolean, default: false },
  useProjectCardStyles: { type: Boolean, default: false },
  emptyEyebrow: { type: String, default: 'No sessions' },
  emptyMessage: { type: String, default: 'No sessions on the selected day.' },
})

const emit = defineEmits<{
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

const getProjectName = (timeBox: TimeBox) =>
  props.projectNameById[timeBox.project] ?? props.projectById[timeBox.project]?.name ?? ''

const getCardStyle = (timeBox: TimeBox) => {
  if (!props.useProjectCardStyles) {
    return {}
  }

  const project = props.projectById[timeBox.project]

  return project ? getProjectSoftSurfaceStyle(project.colors) : {}
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-4">
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
      <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">{{ emptyEyebrow }}</div>
      <div class="mt-2 text-sm text-text-muted">
        {{ emptyMessage }}
      </div>
    </div>

    <div v-else class="flex flex-col gap-3">
      <button
        v-for="timeBox in timeBoxes"
        :key="timeBox.id"
        type="button"
        class="cursor-pointer rounded-2xl border px-4 py-3 text-left transition hover:brightness-97"
        :class="{
          'shadow-panel-selected ring-1 ring-link/35 ring-inset': selectedSessionId === timeBox.id,
        }"
        :style="getCardStyle(timeBox)"
        @click="emit('openSession', timeBox.id)"
      >
        <div class="text-xs font-semibold tracking-[0.14em] text-text-subtle uppercase">
          {{ getSessionTimeRange(timeBox) }}
        </div>
        <div
          v-if="showProjectName && getProjectName(timeBox)"
          class="mt-2 text-[0.72rem] font-semibold tracking-[0.18em] text-text-subtle uppercase"
        >
          {{ getProjectName(timeBox) }}
        </div>
        <div class="mt-1 text-sm font-semibold text-text">
          {{ getSessionNotes(timeBox) }}
        </div>
      </button>
    </div>
  </div>
</template>
