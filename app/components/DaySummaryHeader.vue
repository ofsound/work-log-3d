<script setup lang="ts">
import type { PropType } from 'vue'

import type { TimeBox } from '~~/shared/worklog'
import { getTotalDurationLabel } from '~~/shared/worklog'

const props = defineProps({
  summaryEyebrow: { type: String, default: 'Day' },
  summaryTitle: { type: String, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
})

const daySummary = computed(() => ({
  count: props.timeBoxes.length,
  durationLabel: getTotalDurationLabel(props.timeBoxes),
}))
</script>

<template>
  <div>
    <div v-if="summaryEyebrow" class="text-xs tracking-[0.18em] text-text-subtle uppercase">
      {{ summaryEyebrow }}
    </div>
    <div class="mt-1 text-lg font-bold tracking-tight">{{ summaryTitle }}</div>
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
</template>
