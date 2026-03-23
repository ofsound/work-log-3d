<script setup lang="ts">
import type { PropType } from 'vue'

import { buildWeekDays } from '~~/shared/worklog'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

interface SessionCreateRange {
  startTime: Date
  endTime: Date
}

const props = defineProps({
  anchorDate: { type: Date, required: true },
  createPreviewRange: {
    type: Object as PropType<SessionCreateRange | null>,
    default: null,
  },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
  scrollAlignTarget: { type: Object as PropType<HTMLElement | null>, default: null },
})

const emit = defineEmits<{
  openSession: [sessionId: string]
  openDay: [day: Date]
  createSession: [range: { startTime: Date; endTime: Date }]
  changeSession: [payload: SessionChangePayload]
  dismissCalendar: []
}>()

const days = computed(() => buildWeekDays(props.anchorDate))
</script>

<template>
  <SessionsTimedGrid
    :active-date="anchorDate"
    :create-preview-range="createPreviewRange"
    :days="days"
    :header-click-enabled="true"
    :project-by-id="projectById"
    :project-name-by-id="projectNameById"
    :scroll-align-target="scrollAlignTarget"
    :selected-session-id="selectedSessionId"
    :time-boxes="timeBoxes"
    @change-session="emit('changeSession', $event)"
    @create-session="emit('createSession', $event)"
    @dismiss-calendar="emit('dismissCalendar')"
    @open-day="emit('openDay', $event)"
    @open-session="emit('openSession', $event)"
  />
</template>
