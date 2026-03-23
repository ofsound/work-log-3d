<script setup lang="ts">
import type { PropType } from 'vue'

import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

const props = defineProps({
  anchorDate: { type: Date, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
  scrollAlignTarget: { type: Object as PropType<HTMLElement | null>, default: null },
})

const emit = defineEmits<{
  openSession: [sessionId: string]
  createSession: [range: { startTime: Date; endTime: Date }]
  changeSession: [payload: SessionChangePayload]
}>()

const days = computed(() => [props.anchorDate])
</script>

<template>
  <SessionsTimedGrid
    :active-date="anchorDate"
    :days="days"
    :project-by-id="projectById"
    :project-name-by-id="projectNameById"
    :scroll-align-target="scrollAlignTarget"
    :selected-session-id="selectedSessionId"
    :time-boxes="timeBoxes"
    @change-session="emit('changeSession', $event)"
    @create-session="emit('createSession', $event)"
    @open-session="emit('openSession', $event)"
  />
</template>
