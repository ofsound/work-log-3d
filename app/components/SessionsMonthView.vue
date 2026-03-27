<script setup lang="ts">
import type { PropType } from 'vue'

import {
  CALENDAR_WEEKDAY_HEADER_CELL_CLASS_NAME,
  CALENDAR_WEEKDAY_HEADER_ROW_CLASS_NAME,
} from '~/utils/calendar-header'
import { CALENDAR_SEVEN_DAY_MIN_WIDTH_PX } from '~/utils/calendar-grid'
import {
  getProjectBadgeStyle,
  getProjectDuotoneSoftSurfaceStyle,
} from '~/utils/project-color-styles'
import {
  buildMonthGridDaySegments,
  getMonthGridWeekdays,
  MONTH_GRID_VISIBLE_ROWS,
} from '~/utils/month-grid'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'
import {
  formatDateKey,
  getTimeBoxDurationMinutes,
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
  /** When set (e.g. URL anchor while month sidebar is open), highlight that calendar cell. */
  selectedDate: { type: Object as PropType<Date | null>, default: null },
  selectedSessionId: { type: String, default: '' },
})

const emit = defineEmits<{
  changeSession: [payload: SessionChangePayload]
  openDay: [day: Date]
  openSession: [payload: { day: Date; sessionId: string }]
}>()

const monthGrid = computed(() => buildMonthGridDaySegments(props.timeBoxes, props.anchorDate))
const gridDays = computed(() => monthGrid.value.gridDays)
const daySegmentsByKey = computed(() => monthGrid.value.segmentsByKey)

const dragState = ref<{ timeBox: TimeBox; duplicate: boolean } | null>(null)

const weekdays = computed(() => getMonthGridWeekdays(props.anchorDate))

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProject = (projectId: string) => props.projectById[projectId]
const getProjectStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectDuotoneSoftSurfaceStyle(project.colors) : {}
}

const getDurationBadgeStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectBadgeStyle(project.colors) : {}
}

const getDaySegments = (day: Date) => daySegmentsByKey.value.get(formatDateKey(day)) ?? []

const dayHasSessions = (day: Date) => getDaySegments(day).length > 0

const getVisibleSegments = (day: Date) => getDaySegments(day).slice(0, MONTH_GRID_VISIBLE_ROWS)

const getHiddenCount = (day: Date) =>
  Math.max(0, getDaySegments(day).length - MONTH_GRID_VISIBLE_ROWS)

const formatSegmentTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const isOutsideAnchorMonth = (day: Date) => day.getMonth() !== props.anchorDate.getMonth()

const handleDayCellClick = (day: Date) => {
  if (!dayHasSessions(day)) {
    return
  }

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
      <ContainerCard
        class="overflow-hidden"
        padding="none"
        variant="subtle"
        :style="{ minWidth: `${CALENDAR_SEVEN_DAY_MIN_WIDTH_PX}px` }"
      >
        <div :class="CALENDAR_WEEKDAY_HEADER_ROW_CLASS_NAME">
          <div
            v-for="weekday in weekdays"
            :key="weekday"
            :class="CALENDAR_WEEKDAY_HEADER_CELL_CLASS_NAME"
          >
            {{ weekday }}
          </div>
        </div>

        <div class="grid grid-cols-7">
          <template v-for="day in gridDays" :key="formatDateKey(day)">
            <component
              :is="dayHasSessions(day) ? 'button' : 'div'"
              :type="dayHasSessions(day) ? 'button' : undefined"
              class="flex min-h-40 flex-col gap-2 border-r border-b border-border px-3 py-3 text-left align-top transition last:border-r-0"
              :class="{
                'cursor-pointer hover:bg-surface-muted': dayHasSessions(day),
                'bg-surface-muted/50 text-text-subtle': isOutsideAnchorMonth(day),
                'ring-1 ring-link/20 ring-inset': isSameDay(day, new Date()),
                'ring-2 ring-link/35 ring-inset':
                  dayHasSessions(day) &&
                  props.selectedDate != null &&
                  isSameDay(day, props.selectedDate),
              }"
              @click="handleDayCellClick(day)"
              @dragover.prevent
              @drop="handleSegmentDrop(day, $event)"
            >
              <div class="flex items-center justify-between">
                <div class="text-lg font-semibold">{{ day.getDate() }}</div>
                <div
                  v-if="isSameDay(day, new Date())"
                  class="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-text-inverse"
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
                  @click.stop="emit('openSession', { day, sessionId: segment.timeBox.id })"
                  @dragstart="handleSegmentDragStart(segment.timeBox, $event)"
                  @dragend="handleSegmentDragEnd"
                >
                  <div class="flex min-h-0 items-start justify-between gap-2 overflow-hidden">
                    <div class="min-w-0 flex-1 truncate">
                      <span class="font-semibold">{{
                        formatSegmentTime(segment.segmentStart)
                      }}</span>
                      <span class="ml-1">{{ getProjectName(segment.timeBox.project) }}</span>
                    </div>
                    <DurationPill
                      class="shrink-0"
                      format="minutes"
                      :minutes="getTimeBoxDurationMinutes(segment.timeBox)"
                      :style="getDurationBadgeStyle(segment.timeBox.project)"
                      tone="project"
                      variant="compact"
                    />
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
            </component>
          </template>
        </div>
      </ContainerCard>
    </div>
  </div>
</template>
