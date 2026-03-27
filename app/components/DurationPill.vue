<script setup lang="ts">
import type { CSSProperties, PropType } from 'vue'
import { computed } from 'vue'

import { formatDurationLabel, type DurationDisplayFormat } from '~~/shared/worklog'

type DurationPillVariant = 'summary' | 'compact'
type DurationPillTone = 'duration' | 'neutral' | 'project'

const props = defineProps({
  format: {
    type: String as PropType<DurationDisplayFormat>,
    default: 'hours-decimal',
  },
  minutes: { type: Number, required: true },
  style: {
    type: Object as PropType<CSSProperties>,
    default: () => ({}),
  },
  tone: {
    type: String as PropType<DurationPillTone>,
    default: 'duration',
  },
  variant: {
    type: String as PropType<DurationPillVariant>,
    default: 'summary',
  },
})

const label = computed(() => formatDurationLabel(props.minutes, props.format))

const className = computed(() => {
  if (props.variant === 'summary') {
    return props.tone === 'neutral'
      ? 'rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text tabular-nums shadow-sm'
      : 'rounded-lg bg-badge-duration px-2.5 py-1 text-xs font-bold tracking-tight text-badge-duration-text tabular-nums shadow-sm'
  }

  if (props.tone === 'duration') {
    return 'inline-flex items-center rounded-full bg-badge-duration px-2.5 py-1 text-xs font-bold tracking-wide text-badge-duration-text'
  }

  return 'inline-flex items-center rounded-full border border-border px-1.5 py-px text-[10px] leading-none font-semibold text-text tabular-nums'
})
</script>

<template>
  <span :class="className" :style="style">{{ label }}</span>
</template>
