<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

import type { Project, TimeBox } from '~~/shared/worklog'

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
  /** When false, hides the day title and aggregate stats (e.g. parent already shows them). */
  showDaySummary: { type: Boolean, default: true },
  /** Optional summary label above the title (used for date-range summaries). */
  summaryEyebrow: { type: String, default: '' },
  /** When set, replaces the formatted single-day title. */
  summaryTitleOverride: { type: String, default: '' },
  showProjectCount: { type: Boolean, default: false },
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

const summaryTitle = computed(() =>
  props.summaryTitleOverride.length > 0 ? props.summaryTitleOverride : dayTitle.value,
)

const showProjectChip = computed(() => props.showProjectName)
</script>

<template>
  <div class="flex flex-col gap-4 pb-4">
    <div v-if="showDaySummary" data-testid="day-summary">
      <DaySummaryHeader
        :show-project-count="showProjectCount"
        :summary-eyebrow="summaryEyebrow"
        :summary-title="summaryTitle"
        :time-boxes="timeBoxes"
      />
    </div>

    <ContainerCard
      v-if="timeBoxes.length === 0"
      class="border-dashed py-8 text-center shadow-none"
      variant="default"
    >
      <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">{{ emptyEyebrow }}</div>
      <div class="mt-2 text-sm text-text-muted">
        {{ emptyMessage }}
      </div>
    </ContainerCard>

    <div v-else class="flex flex-col gap-3">
      <TimeBox
        v-for="timeBox in timeBoxes"
        :id="timeBox.id"
        :key="timeBox.id"
        compact
        flush-top
        hide-actions
        :hide-project-chip="!showProjectChip"
        interactive
        :selected="selectedSessionId === timeBox.id"
        :use-project-card-styles="useProjectCardStyles"
        variant="overview"
        @open="emit('openSession', timeBox.id)"
      />
    </div>
  </div>
</template>
