<script setup lang="ts">
import type { PropType } from 'vue'

import type { TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const props = defineProps({
  summaryEyebrow: { type: String, default: '' },
  summaryTitle: { type: String, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  showProjectCount: { type: Boolean, default: false },
  metadataTopSpacingClass: { type: String, default: '' },
})

const daySummary = computed(() => ({
  count: props.timeBoxes.length,
  durationLabel: getTotalDurationLabel(props.timeBoxes),
  projectCount: new Set(props.timeBoxes.map((timeBox) => timeBox.project)).size,
}))
</script>

<template>
  <div>
    <div v-if="summaryEyebrow" class="text-xs tracking-[0.18em] text-text-subtle uppercase">
      {{ summaryEyebrow }}
    </div>
    <div
      :class="
        summaryEyebrow
          ? 'mt-1 text-lg font-bold tracking-tight'
          : 'text-lg font-bold tracking-tight'
      "
    >
      {{ summaryTitle }}
    </div>
    <div
      :class="
        metadataTopSpacingClass ||
        (summaryEyebrow ? 'mt-3 flex flex-wrap gap-2' : 'mt-4 flex flex-wrap gap-2')
      "
    >
      <div
        class="rounded-lg bg-badge-duration px-2.5 py-1 text-xs font-bold tracking-tight text-badge-duration-text tabular-nums shadow-sm"
      >
        {{ daySummary.durationLabel }} hrs
      </div>
      <div
        class="rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text shadow-sm"
      >
        {{ daySummary.count }} sessions
      </div>
      <div
        v-if="showProjectCount"
        class="rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text shadow-sm"
      >
        {{ daySummary.projectCount }} projects
      </div>
    </div>
  </div>
</template>
