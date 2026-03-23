<script setup lang="ts">
import type { PropType } from 'vue'

import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import {
  buildMonthGridDaySegments,
  getMonthGridWeekdays,
  MONTH_GRID_VISIBLE_ROWS,
} from '~/utils/month-grid'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'
import {
  formatDateKey,
  getDurationMinutesLabel,
  isSameDay,
  moveTimeBoxToDay,
} from '~~/shared/worklog'

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
})

const emit = defineEmits(['openSession', 'openDay', 'changeSession'])

const monthGrid = computed(() => buildMonthGridDaySegments(props.timeBoxes, props.anchorDate))
const gridDays = computed(() => monthGrid.value.gridDays)
const daySegmentsByKey = computed(() => monthGrid.value.segmentsByKey)

const dragState = ref<{ timeBox: TimeBox; duplicate: boolean } | null>(null)

const weekdays = computed(() => getMonthGridWeekdays(props.anchorDate))

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProject = (projectId: string) => props.projectById[projectId]
const getProjectStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectSoftSurfaceStyle(project.colors) : {}
}

const getDurationBadgeStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectBadgeStyle(project.colors) : {}
}

const getDaySegments = (day: Date) => daySegmentsByKey.value.get(formatDateKey(day)) ?? []

const getVisibleSegments = (day: Date) => getDaySegments(day).slice(0, MONTH_GRID_VISIBLE_ROWS)

const getHiddenCount = (day: Date) =>
  Math.max(0, getDaySegments(day).length - MONTH_GRID_VISIBLE_ROWS)

const formatSegmentTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const isOutsideAnchorMonth = (day: Date) => day.getMonth() !== props.anchorDate.getMonth()

const handleDayClick = (day: Date) => {
  emit('openDay', day)
}

const handleSegmentDragStart = (timeBox: TimeBox, event: DragEvent) => {
  if (!event.dataTransfer) {
    return
  }

  dragState.value = {
    timeBox,
    duplicate: event.altKey,
  }
  event.dataTransfer.effectAllowed = event.altKey ? 'copyMove' : 'move'
  event.dataTransfer.setData('text/plain', timeBox.id)
}

const handleSegmentDrop = (day: Date, event: DragEvent) => {
  event.preventDefault()

  if (!dragState.value) {
    return
  }

  emit('changeSession', {
    id: dragState.value.timeBox.id,
    input: moveTimeBoxToDay(dragState.value.timeBox, day),
    duplicate: dragState.value.duplicate,
  } satisfies SessionChangePayload)

  dragState.value = null
}

const handleSegmentDragEnd = () => {
  dragState.value = null
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <div class="h-full overflow-auto overscroll-contain px-6 py-6">
      <div
        class="min-w-[980px] overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
      >
        <div class="grid grid-cols-7 border-b border-border bg-surface-muted">
          <div
            v-for="weekday in weekdays"
            :key="weekday"
            class="border-r border-border px-4 py-3 text-sm font-semibold tracking-[0.18em] text-text-subtle uppercase last:border-r-0"
          >
            {{ weekday }}
          </div>
        </div>

        <div class="grid grid-cols-7">
          <button
            v-for="day in gridDays"
            :key="formatDateKey(day)"
            class="flex min-h-40 cursor-pointer flex-col gap-2 border-r border-b border-border px-3 py-3 text-left align-top transition last:border-r-0 hover:bg-surface-muted"
            :class="{
              'bg-surface-muted/50 text-text-subtle': isOutsideAnchorMonth(day),
              'ring-1 ring-link/20 ring-inset': isSameDay(day, new Date()),
            }"
            @click="handleDayClick(day)"
            @dragover.prevent
            @drop="handleSegmentDrop(day, $event)"
          >
            <div class="flex items-center justify-between">
              <div class="text-lg font-semibold">{{ day.getDate() }}</div>
              <div
                v-if="isSameDay(day, new Date())"
                class="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white"
              >
                Today
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <button
                v-for="segment in getVisibleSegments(day)"
                :key="segment.id"
                class="cursor-pointer rounded-md border px-2 py-1 text-left text-xs text-text hover:brightness-97"
                :class="{
                  'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                    selectedSessionId === segment.timeBox.id,
                }"
                :style="getProjectStyle(segment.timeBox.project)"
                draggable="true"
                @click.stop="emit('openSession', segment.timeBox.id)"
                @dragstart="handleSegmentDragStart(segment.timeBox, $event)"
                @dragend="handleSegmentDragEnd"
              >
                <div class="flex min-h-0 items-start justify-between gap-2 overflow-hidden">
                  <div class="min-w-0 flex-1 truncate">
                    <span class="font-semibold">{{ formatSegmentTime(segment.segmentStart) }}</span>
                    <span class="ml-1">{{ getProjectName(segment.timeBox.project) }}</span>
                  </div>
                  <div
                    class="shrink-0 rounded-full border px-1.5 py-px text-[10px] leading-none font-semibold"
                    :style="getDurationBadgeStyle(segment.timeBox.project)"
                  >
                    {{ getDurationMinutesLabel(segment.timeBox) }}
                  </div>
                </div>
              </button>

              <button
                v-if="getHiddenCount(day) > 0"
                class="cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-left text-xs font-semibold text-text-subtle hover:bg-surface"
                @click.stop="emit('openDay', day)"
              >
                +{{ getHiddenCount(day) }} more
              </button>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
