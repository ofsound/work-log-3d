<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import ChevronLeftIcon from '@/icons/ChevronLeftIcon.vue'
import CloseIcon from '@/icons/CloseIcon.vue'

import { formatDateKey, type Project, type TimeBox } from '~~/shared/worklog'

const props = defineProps({
  day: { type: Date, required: true },
  mode: { type: String as PropType<'day' | 'session'>, required: true },
  overlay: { type: Boolean, default: false },
  project: { type: Object as PropType<Project | null>, default: null },
  rangeEndDay: { type: Object as PropType<Date | null>, default: null },
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

const isRangeSummary = computed(
  () => props.rangeEndDay != null && formatDateKey(props.rangeEndDay) !== formatDateKey(props.day),
)

const rangeSummaryTitle = computed(() => {
  if (!isRangeSummary.value || !props.rangeEndDay) {
    return ''
  }

  const from = props.day
  const to = props.rangeEndDay

  if (from.getFullYear() === to.getFullYear()) {
    const left = from.toLocaleDateString([], { month: 'short', day: 'numeric' })
    const right = to.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    return `${left} – ${right}`
  }

  const left = from.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const right = to.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
})

const rangeEmptyMessage = computed(() =>
  isRangeSummary.value
    ? 'This project has no sessions in the selected date range.'
    : 'This project has no sessions on the selected day.',
)

const projectById = computed(() =>
  props.project ? ({ [props.project.id]: props.project } as Record<string, Project>) : {},
)

const showOverlayDaySummary = computed(() => props.overlay && props.mode === 'day')
</script>

<template>
  <WorkspaceSidePanelFrame
    :body-padding-class="mode === 'session' && sessionId ? 'pb-4' : 'pt-4 pb-4'"
    :overlay="overlay"
  >
    <template #header>
      <div
        class="flex shrink-0 items-center justify-between gap-3 px-3 pb-2"
        :class="overlay ? 'pt-2' : 'pt-3'"
      >
        <button
          v-if="mode === 'session'"
          type="button"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition"
          :class="
            overlay
              ? 'text-text-muted hover:bg-overlay-inverse hover:text-text'
              : 'text-text-subtle hover:bg-surface hover:text-text'
          "
          @click="emit('backToDay')"
        >
          <ChevronLeftIcon />
          Back
        </button>
        <div v-else />

        <button
          type="button"
          class="cursor-pointer rounded-md p-2 text-text-subtle hover:text-text"
          :class="overlay ? 'hover:bg-overlay-inverse' : 'hover:bg-surface'"
          aria-label="Close"
          @click="emit('close')"
        >
          <CloseIcon />
        </button>
      </div>
    </template>

    <template v-if="mode === 'session' && sessionId" #subheader>
      <div :class="overlay ? '-mt-1 px-4 pt-0 pb-3' : 'px-4 pt-4 pb-3'">
        <div class="text-lg font-bold tracking-tight">{{ dayTitle }}</div>
      </div>
    </template>

    <template v-else-if="showOverlayDaySummary" #subheader>
      <div class="-mt-1 px-4 pt-0 pb-3">
        <DaySummaryHeader
          metadata-top-spacing-class="mt-2 flex flex-wrap gap-2"
          :summary-eyebrow="isRangeSummary ? 'Date range' : ''"
          :summary-title="isRangeSummary ? rangeSummaryTitle : dayTitle"
          :time-boxes="timeBoxes"
        />
      </div>
    </template>

    <div
      v-if="mode === 'session' && sessionId"
      class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <TimeBox
        :id="sessionId"
        embedded-in-panel
        hide-project-chip
        flush-top
        @deleted="emit('close')"
      />
    </div>

    <DaySessionsOverviewPanel
      v-else
      class="px-4"
      :day="day"
      :empty-message="rangeEmptyMessage"
      :project-by-id="projectById"
      :selected-session-id="selectedSessionId"
      :show-day-summary="!showOverlayDaySummary"
      :summary-eyebrow="isRangeSummary ? 'Date range' : ''"
      :summary-title-override="isRangeSummary ? rangeSummaryTitle : ''"
      :time-boxes="timeBoxes"
      :use-project-card-styles="Boolean(project)"
      @open-session="emit('openSession', $event)"
    />
  </WorkspaceSidePanelFrame>
</template>
