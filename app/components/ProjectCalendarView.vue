<script setup lang="ts">
import type { PropType } from 'vue'

import {
  buildMonthGridDaySegments,
  getMonthGridWeekdays,
  type MonthGridSegmentEntry,
  MONTH_GRID_VISIBLE_ROWS,
} from '~/utils/month-grid'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox, TimeBoxInput, YearHeatmapMonth } from '~~/shared/worklog'
import {
  formatDateKey,
  getDurationMinutesLabel,
  isSameDay,
  moveTimeBoxToDay,
  parseDateKey,
} from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

const props = defineProps({
  months: { type: Array as PropType<YearHeatmapMonth[]>, default: () => [] },
  project: { type: Object as PropType<Project | null>, default: null },
  selectedDate: { type: Object as PropType<Date | null>, default: null },
  /** Inclusive end day when the sidebar shows a multi-day aggregate (`dateEnd` query). */
  selectedRangeEnd: { type: Object as PropType<Date | null>, default: null },
  selectedSessionId: { type: String, default: '' },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
})

const emit = defineEmits<{
  changeSession: [payload: SessionChangePayload]
  openDay: [day: Date]
  openSession: [payload: { day: Date; sessionId: string }]
  selectDayRange: [payload: { start: Date; end: Date }]
}>()

const dragState = ref<{ timeBox: TimeBox; duplicate: boolean } | null>(null)

const RANGE_DRAG_THRESHOLD_PX = 6

const rangePointerState = ref<{
  anchor: Date
  current: Date
  didMoveCells: boolean
  startClientX: number
  startClientY: number
  didExceedPixelThreshold: boolean
} | null>(null)

const detachRangePointerListeners = () => {
  window.removeEventListener('pointermove', handleRangePointerMove)
  window.removeEventListener('pointerup', handleRangePointerUp)
}

const handleRangePointerMove = (event: PointerEvent) => {
  const state = rangePointerState.value
  if (!state) {
    return
  }

  const dx = event.clientX - state.startClientX
  const dy = event.clientY - state.startClientY
  if (dx * dx + dy * dy > RANGE_DRAG_THRESHOLD_PX * RANGE_DRAG_THRESHOLD_PX) {
    state.didExceedPixelThreshold = true
  }

  const hit = document.elementFromPoint(event.clientX, event.clientY)
  const cell = hit?.closest('[data-project-calendar-day]')
  if (!(cell instanceof HTMLElement)) {
    return
  }

  const key = cell.dataset.projectCalendarDay
  const parsed = key ? parseDateKey(key) : null
  if (!parsed) {
    return
  }

  if (formatDateKey(parsed) !== formatDateKey(state.current)) {
    state.didMoveCells = true
  }

  state.current = parsed
}

const handleRangePointerUp = () => {
  const state = rangePointerState.value
  rangePointerState.value = null
  detachRangePointerListeners()

  if (!state) {
    return
  }

  const sameDay = formatDateKey(state.anchor) === formatDateKey(state.current)
  const shouldCommitRange = state.didMoveCells || !sameDay
  const shouldSuppressClick = state.didMoveCells || state.didExceedPixelThreshold || !sameDay

  if (shouldCommitRange) {
    const startKey = formatDateKey(state.anchor)
    const endKey = formatDateKey(state.current)
    const start = startKey <= endKey ? state.anchor : state.current
    const end = startKey <= endKey ? state.current : state.anchor
    emit('selectDayRange', { start, end })
  }

  if (shouldSuppressClick) {
    const stopClick = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault()
      clickEvent.stopImmediatePropagation()
      window.removeEventListener('click', stopClick, true)
    }

    window.addEventListener('click', stopClick, true)
  }
}

const handleDayPointerDown = (day: Date, event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  const target = event.target
  if (target instanceof HTMLElement && target.closest('button[draggable="true"]')) {
    return
  }

  rangePointerState.value = {
    anchor: day,
    current: day,
    didMoveCells: false,
    startClientX: event.clientX,
    startClientY: event.clientY,
    didExceedPixelThreshold: false,
  }

  window.addEventListener('pointermove', handleRangePointerMove)
  window.addEventListener('pointerup', handleRangePointerUp)
}

onUnmounted(() => {
  detachRangePointerListeners()
})

const monthEntries = computed(() =>
  props.months.map((month) => {
    const anchorDate = new Date(month.year, month.monthIndex, 1)
    const monthGrid = buildMonthGridDaySegments(props.timeBoxes, anchorDate)

    return {
      ...month,
      anchorDate,
      gridDays: monthGrid.gridDays,
      segmentsByKey: monthGrid.segmentsByKey,
      weekdays: getMonthGridWeekdays(anchorDate),
    }
  }),
)

const projectStyle = computed(() =>
  props.project ? getProjectSoftSurfaceStyle(props.project.colors) : {},
)
const durationBadgeStyle = computed(() =>
  props.project ? getProjectBadgeStyle(props.project.colors) : {},
)

const getDaySegments = (segmentsByKey: Map<string, MonthGridSegmentEntry[]>, day: Date) =>
  segmentsByKey.get(formatDateKey(day)) ?? []

const dayHasSessions = (segmentsByKey: Map<string, MonthGridSegmentEntry[]>, day: Date) =>
  getDaySegments(segmentsByKey, day).length > 0

const handleDayCellClick = (segmentsByKey: Map<string, MonthGridSegmentEntry[]>, day: Date) => {
  if (!dayHasSessions(segmentsByKey, day)) {
    return
  }

  emit('openDay', day)
}

const getVisibleSegments = (segmentsByKey: Map<string, MonthGridSegmentEntry[]>, day: Date) =>
  getDaySegments(segmentsByKey, day).slice(0, MONTH_GRID_VISIBLE_ROWS)

const getHiddenCount = (segmentsByKey: Map<string, MonthGridSegmentEntry[]>, day: Date) =>
  Math.max(0, getDaySegments(segmentsByKey, day).length - MONTH_GRID_VISIBLE_ROWS)

const isOutsideAnchorMonth = (day: Date, anchorDate: Date) =>
  day.getMonth() !== anchorDate.getMonth()

const isDayInPreviewRange = (day: Date) => {
  const state = rangePointerState.value
  if (!state) {
    return false
  }

  const d = formatDateKey(day)
  const a = formatDateKey(state.anchor)
  const b = formatDateKey(state.current)
  const lo = a <= b ? a : b
  const hi = a <= b ? b : a

  return d >= lo && d <= hi
}

const isDayInRouteRange = (day: Date) => {
  if (props.selectedDate == null || props.selectedRangeEnd == null) {
    return false
  }

  if (formatDateKey(props.selectedRangeEnd) === formatDateKey(props.selectedDate)) {
    return false
  }

  const d = formatDateKey(day)
  const a = formatDateKey(props.selectedDate)
  const b = formatDateKey(props.selectedRangeEnd)
  const lo = a <= b ? a : b
  const hi = a <= b ? b : a

  return d >= lo && d <= hi
}

const showCalendarSelectionRing = (
  segmentsByKey: Map<string, MonthGridSegmentEntry[]>,
  day: Date,
) => {
  if (isDayInPreviewRange(day) || isDayInRouteRange(day)) {
    return true
  }

  if (props.selectedDate == null) {
    return false
  }

  const isMultiDayRoute =
    props.selectedRangeEnd != null &&
    formatDateKey(props.selectedRangeEnd) !== formatDateKey(props.selectedDate)

  if (isMultiDayRoute) {
    return false
  }

  return dayHasSessions(segmentsByKey, day) && isSameDay(day, props.selectedDate)
}

const formatSegmentTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const getSegmentDuration = (timeBox: TimeBox) => getDurationMinutesLabel(timeBox)

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
      <div class="flex w-full min-w-[980px] flex-col gap-6">
        <ContainerCard
          v-for="month in monthEntries"
          :key="`${month.year}-${month.monthIndex}`"
          as="section"
          class="overflow-hidden"
          padding="none"
          variant="subtle"
        >
          <div class="border-b border-border bg-surface-muted px-4 py-4">
            <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">{{ month.year }}</div>
            <div class="mt-1 text-2xl font-bold tracking-tight">{{ month.label }}</div>
          </div>

          <div class="grid grid-cols-7 border-b border-border bg-surface-muted">
            <div
              v-for="weekday in month.weekdays"
              :key="`${month.year}-${month.monthIndex}-${weekday}`"
              class="border-r border-border px-4 py-3 text-sm font-semibold tracking-[0.18em] text-text-subtle uppercase last:border-r-0"
            >
              {{ weekday }}
            </div>
          </div>

          <div class="grid grid-cols-7">
            <template v-for="day in month.gridDays" :key="formatDateKey(day)">
              <component
                :is="dayHasSessions(month.segmentsByKey, day) ? 'button' : 'div'"
                :type="dayHasSessions(month.segmentsByKey, day) ? 'button' : undefined"
                class="flex min-h-40 flex-col gap-2 border-r border-b border-border px-3 py-3 text-left align-top transition last:border-r-0"
                :data-project-calendar-day="formatDateKey(day)"
                :class="{
                  'cursor-pointer hover:bg-surface-muted': dayHasSessions(month.segmentsByKey, day),
                  'bg-surface-muted/50 text-text-subtle': isOutsideAnchorMonth(
                    day,
                    month.anchorDate,
                  ),
                  'ring-1 ring-link/20 ring-inset': showCalendarSelectionRing(
                    month.segmentsByKey,
                    day,
                  ),
                  'select-none': rangePointerState != null,
                }"
                @click="handleDayCellClick(month.segmentsByKey, day)"
                @pointerdown="handleDayPointerDown(day, $event)"
                @dragover.prevent
                @drop="handleSegmentDrop(day, $event)"
              >
                <div class="flex items-center justify-between gap-2">
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
                    v-for="segment in getVisibleSegments(month.segmentsByKey, day)"
                    :key="segment.id"
                    class="cursor-pointer rounded-md border px-2 py-1 text-left text-xs text-text hover:brightness-97"
                    :class="{
                      'ring-2 ring-link/20 ring-inset': selectedSessionId === segment.timeBox.id,
                    }"
                    :style="projectStyle"
                    draggable="true"
                    @click.stop="emit('openSession', { day, sessionId: segment.timeBox.id })"
                    @dragstart="handleSegmentDragStart(segment.timeBox, $event)"
                    @dragend="handleSegmentDragEnd"
                  >
                    <div
                      class="flex min-h-0 w-full items-center justify-between gap-2 overflow-hidden"
                    >
                      <span class="min-w-0 truncate font-semibold">{{
                        formatSegmentTime(segment.segmentStart)
                      }}</span>
                      <span
                        class="shrink-0 rounded-full border px-1.5 py-px text-[10px] leading-none font-semibold"
                        :style="durationBadgeStyle"
                      >
                        {{ getSegmentDuration(segment.timeBox) }}
                      </span>
                    </div>
                  </button>

                  <button
                    v-if="getHiddenCount(month.segmentsByKey, day) > 0"
                    class="cursor-pointer rounded-md border border-dashed border-border px-2 py-1 text-left text-xs font-semibold text-text-subtle hover:bg-surface"
                    @click.stop="emit('openDay', day)"
                  >
                    +{{ getHiddenCount(month.segmentsByKey, day) }} more
                  </button>
                </div>
              </component>
            </template>
          </div>
        </ContainerCard>
      </div>
    </div>
  </div>
</template>
