<script setup lang="ts">
import type { PropType } from 'vue'

import {
  CALENDAR_WEEKDAY_HEADER_LABEL_CLASS_NAME,
  TIMED_WEEK_HEADER_CELL_CLASS_NAME,
  TIMED_WEEK_HEADER_HEIGHT_PX,
} from '~/utils/calendar-header'
import { getTimedGridMinWidthPx, TIMED_GRID_TIME_GUTTER_WIDTH_PX } from '~/utils/calendar-grid'
import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type {
  Project,
  TimeBox,
  TimeBoxDaySegment,
  TimeBoxDaySegmentLayout,
  TimeBoxInput,
} from '~~/shared/worklog'
import {
  addDays,
  addMinutes,
  buildDaySegmentLayouts,
  formatDateKey,
  getTimeBoxDurationMinutes,
  getMinutesSinceStartOfDay,
  getStartOfDay,
  isSameDay,
  MINUTES_PER_DAY,
  moveTimeBoxToStart,
  resizeTimeBoxEnd,
  resizeTimeBoxStart,
  splitTimeBoxIntoDaySegments,
} from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

interface PreviewEvent {
  input: Pick<TimeBoxInput, 'startTime' | 'endTime'>
  duplicate: boolean
}

interface SessionCreateRange {
  startTime: Date
  endTime: Date
}

const props = defineProps({
  activeDate: { type: Date, required: true },
  createPreviewRange: {
    type: Object as PropType<SessionCreateRange | null>,
    default: null,
  },
  days: { type: Array as PropType<Date[]>, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
  scrollAlignTarget: { type: Object as PropType<HTMLElement | null>, default: null },
  headerClickEnabled: { type: Boolean, default: false },
})

const emit = defineEmits([
  'openSession',
  'openScratchpad',
  'openDay',
  'createSession',
  'changeSession',
  /** Week view: empty grid click (no drag) — parent should match Escape (clear selection / close panel). */
  'dismissCalendar',
])

const HOUR_HEIGHT = 72
const TIME_GUTTER_WIDTH = TIMED_GRID_TIME_GUTTER_WIDTH_PX
const DAY_VIEW_MIN_DAY_COLUMN_WIDTH = 160
const SNAP_MINUTES = 10
const MINIMUM_DURATION_MINUTES = 10
const INTERACTION_THRESHOLD = 4
/** Y offset of the 7:30am grid line from the top of the calendar surface (7.5 hours). */
const SEVEN_THIRTY_TOP_PX = 7.5 * HOUR_HEIGHT

type InteractionState =
  | {
      mode: 'create'
      startDayIndex: number
      startMinutes: number
      currentDayIndex: number
      currentMinutes: number
      moved: boolean
    }
  | {
      mode: 'move'
      timeBox: TimeBox
      segmentStart: Date
      pointerOffsetMinutes: number
      duplicate: boolean
      moved: boolean
    }
  | {
      mode: 'resize'
      timeBox: TimeBox
      edge: 'start' | 'end'
      moved: boolean
    }

const scrollContainerRef = ref<HTMLElement | null>(null)
const weekHeaderRef = ref<HTMLElement | null>(null)
const weekCalendarGridRef = ref<HTMLElement | null>(null)
const calendarSurfaceRef = ref<HTMLElement | null>(null)
const sevenThirtyLineRef = ref<HTMLElement | null>(null)
const interactionState = ref<InteractionState | null>(null)
/** Week view: ignore the next backing click after a drag gesture (click can still fire on the column surface). */
const suppressNextWeekColumnBackingClick = ref(false)
const lastPointerSlot = ref<{ dayIndex: number; minutes: number } | null>(null)
const pointerOrigin = ref({ x: 0, y: 0 })
const now = ref(new Date())

let nowTimer: ReturnType<typeof setInterval> | undefined

const visibleDays = computed(() => (props.days.length > 0 ? props.days : [props.activeDate]))
const isWeekView = computed(() => visibleDays.value.length > 1)
const calendarRange = computed(() => {
  const firstDay = visibleDays.value[0]!
  const lastDay = visibleDays.value[visibleDays.value.length - 1]!

  return {
    start: getStartOfDay(firstDay),
    end: addDays(getStartOfDay(lastDay), 1),
  }
})
const hours = computed(() => Array.from({ length: 24 }, (_, index) => index))
const dayViewGridStyle = computed(() => ({
  gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(${visibleDays.value.length}, minmax(${DAY_VIEW_MIN_DAY_COLUMN_WIDTH}px, 1fr))`,
  minWidth: `${TIME_GUTTER_WIDTH + DAY_VIEW_MIN_DAY_COLUMN_WIDTH * visibleDays.value.length}px`,
}))
const weekGridStyle = computed(() => ({
  gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(${visibleDays.value.length}, minmax(0, 1fr))`,
  minWidth: `${getTimedGridMinWidthPx(visibleDays.value.length)}px`,
}))

const segmentsByDayKey = computed(() => {
  const map = new Map<string, TimeBoxDaySegment[]>()

  props.timeBoxes.forEach((timeBox) => {
    splitTimeBoxIntoDaySegments(timeBox, calendarRange.value).forEach((segment) => {
      const key = formatDateKey(segment.dayStart)
      const current = map.get(key) ?? []

      current.push(segment)
      map.set(key, current)
    })
  })

  return map
})

const dayLayouts = computed(() =>
  visibleDays.value.map((day) =>
    buildDaySegmentLayouts(segmentsByDayKey.value.get(formatDateKey(day)) ?? []),
  ),
)

const nowMarker = computed(() => {
  const dayIndex = visibleDays.value.findIndex((day) => isSameDay(day, now.value))

  if (dayIndex < 0) {
    return null
  }

  return {
    dayIndex,
    top: (getMinutesSinceStartOfDay(now.value) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24,
  }
})

const previewEvent = computed<PreviewEvent | null>(() => {
  const state = interactionState.value

  if (!state || !state.moved) {
    return null
  }

  if (state.mode === 'create') {
    const startSlot = createDateForSlot(state.startDayIndex, state.startMinutes)
    const endSlot = createDateForSlot(state.currentDayIndex, state.currentMinutes)
    const startTime = startSlot.valueOf() <= endSlot.valueOf() ? startSlot : endSlot
    const endTime = startSlot.valueOf() <= endSlot.valueOf() ? endSlot : startSlot

    return {
      input: {
        startTime,
        endTime: enforceMinimumEnd(startTime, endTime),
      },
      duplicate: false,
    }
  }

  if (state.mode === 'move') {
    const slot = lastPointerSlot.value

    if (!slot) {
      return null
    }

    const nextSegmentStart = addMinutes(
      getStartOfDay(visibleDays.value[slot.dayIndex]!),
      slot.minutes - state.pointerOffsetMinutes,
    )
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )

    return {
      input: moveTimeBoxToStart(state.timeBox, addMinutes(nextSegmentStart, -segmentDeltaMinutes)),
      duplicate: state.duplicate,
    }
  }

  const slot = lastPointerSlot.value

  if (!slot) {
    return null
  }

  const nextDate = addMinutes(getStartOfDay(visibleDays.value[slot.dayIndex]!), slot.minutes)

  return {
    input:
      state.edge === 'start'
        ? resizeTimeBoxStart(state.timeBox, clampResizeStart(state.timeBox, nextDate))
        : resizeTimeBoxEnd(state.timeBox, clampResizeEnd(state.timeBox, nextDate)),
    duplicate: false,
  }
})

const createDateForSlot = (dayIndex: number, minutes: number) =>
  addMinutes(getStartOfDay(visibleDays.value[dayIndex] ?? props.activeDate), minutes)

const clampMinutes = (minutes: number) => {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return Math.min(MINUTES_PER_DAY, Math.max(0, snapped))
}

const enforceMinimumEnd = (startTime: Date, endTime: Date) =>
  endTime.valueOf() - startTime.valueOf() < MINIMUM_DURATION_MINUTES * 60_000
    ? addMinutes(startTime, MINIMUM_DURATION_MINUTES)
    : endTime

const clampResizeStart = (timeBox: TimeBox, value: Date) => {
  const endTime = timeBox.endTime ?? addMinutes(value, MINIMUM_DURATION_MINUTES)
  const latestAllowed = addMinutes(endTime, -MINIMUM_DURATION_MINUTES)

  return value.valueOf() >= latestAllowed.valueOf() ? latestAllowed : value
}

const clampResizeEnd = (timeBox: TimeBox, value: Date) => {
  const startTime = timeBox.startTime ?? addMinutes(value, -MINIMUM_DURATION_MINUTES)
  const earliestAllowed = addMinutes(startTime, MINIMUM_DURATION_MINUTES)

  return value.valueOf() <= earliestAllowed.valueOf() ? earliestAllowed : value
}

const getPointerSlot = (clientX: number, clientY: number) => {
  const surface = calendarSurfaceRef.value

  if (!surface) {
    return null
  }

  const offsetY = clientY - surface.getBoundingClientRect().top

  if (offsetY < 0) {
    return null
  }

  const minutes = clampMinutes((offsetY / (HOUR_HEIGHT * 24)) * MINUTES_PER_DAY)

  if (visibleDays.value.length === 1) {
    return { dayIndex: 0, minutes }
  }

  const grid = weekCalendarGridRef.value

  if (!grid) {
    return null
  }

  const gridRect = grid.getBoundingClientRect()
  const relativeX = clientX - gridRect.left - TIME_GUTTER_WIDTH
  const dayAreaWidth = Math.max(0, gridRect.width - TIME_GUTTER_WIDTH)
  const columnWidth = dayAreaWidth / visibleDays.value.length

  if (relativeX < 0 || relativeX >= dayAreaWidth || columnWidth <= 0) {
    return null
  }

  return {
    dayIndex: Math.min(visibleDays.value.length - 1, Math.floor(relativeX / columnWidth)),
    minutes,
  }
}

const markInteractionMoved = (event: PointerEvent) => {
  const deltaX = Math.abs(event.clientX - pointerOrigin.value.x)
  const deltaY = Math.abs(event.clientY - pointerOrigin.value.y)

  return deltaX > INTERACTION_THRESHOLD || deltaY > INTERACTION_THRESHOLD
}

const updatePointerState = (event: PointerEvent) => {
  const slot = getPointerSlot(event.clientX, event.clientY)

  if (!slot) {
    return
  }

  lastPointerSlot.value = slot

  const state = interactionState.value

  if (!state) {
    return
  }

  if (state.mode === 'create') {
    state.currentDayIndex = slot.dayIndex
    state.currentMinutes = slot.minutes
  }

  state.moved = state.moved || markInteractionMoved(event)
}

const handleWindowPointerMove = (event: PointerEvent) => {
  updatePointerState(event)
}

const stopInteraction = () => {
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
}

const handleWindowPointerUp = (event: PointerEvent) => {
  updatePointerState(event)

  const state = interactionState.value
  interactionState.value = null
  stopInteraction()

  if (!state) {
    return
  }

  if (state.mode === 'create') {
    if (!state.moved) {
      if (isWeekView.value) {
        emit('dismissCalendar')
      } else {
        emit('openScratchpad')
      }
      return
    }

    const startSlot = createDateForSlot(state.startDayIndex, state.startMinutes)
    const endSlot = createDateForSlot(state.currentDayIndex, state.currentMinutes)
    const startTime = startSlot.valueOf() <= endSlot.valueOf() ? startSlot : endSlot
    const endTime = startSlot.valueOf() <= endSlot.valueOf() ? endSlot : startSlot

    if (isWeekView.value) {
      suppressNextWeekColumnBackingClick.value = true
    }

    emit('createSession', {
      startTime,
      endTime: enforceMinimumEnd(startTime, endTime),
    })
    return
  }

  if (state.mode === 'move') {
    if (!state.moved) {
      emit('openSession', state.timeBox.id)
      return
    }

    const slot = getPointerSlot(event.clientX, event.clientY)

    if (!slot) {
      return
    }

    const nextSegmentStart = addMinutes(
      getStartOfDay(visibleDays.value[slot.dayIndex]!),
      slot.minutes - state.pointerOffsetMinutes,
    )
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )

    if (isWeekView.value) {
      suppressNextWeekColumnBackingClick.value = true
    }

    emit('changeSession', {
      id: state.timeBox.id,
      input: moveTimeBoxToStart(state.timeBox, addMinutes(nextSegmentStart, -segmentDeltaMinutes)),
      duplicate: state.duplicate,
    } satisfies SessionChangePayload)
    return
  }

  if (!state.moved) {
    return
  }

  const slot = getPointerSlot(event.clientX, event.clientY)

  if (!slot) {
    return
  }

  const nextDate = addMinutes(getStartOfDay(visibleDays.value[slot.dayIndex]!), slot.minutes)

  if (isWeekView.value) {
    suppressNextWeekColumnBackingClick.value = true
  }

  emit('changeSession', {
    id: state.timeBox.id,
    input:
      state.edge === 'start'
        ? resizeTimeBoxStart(state.timeBox, clampResizeStart(state.timeBox, nextDate))
        : resizeTimeBoxEnd(state.timeBox, clampResizeEnd(state.timeBox, nextDate)),
    duplicate: false,
  } satisfies SessionChangePayload)
}

const beginInteraction = (state: InteractionState, event: PointerEvent) => {
  interactionState.value = state
  pointerOrigin.value = { x: event.clientX, y: event.clientY }
  lastPointerSlot.value = getPointerSlot(event.clientX, event.clientY)

  window.addEventListener('pointermove', handleWindowPointerMove)
  window.addEventListener('pointerup', handleWindowPointerUp)
}

const handleCreatePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  if (isWeekView.value) {
    suppressNextWeekColumnBackingClick.value = false
  }

  const slot = getPointerSlot(event.clientX, event.clientY)

  if (!slot) {
    return
  }

  beginInteraction(
    {
      mode: 'create',
      startDayIndex: slot.dayIndex,
      startMinutes: slot.minutes,
      currentDayIndex: slot.dayIndex,
      currentMinutes: slot.minutes,
      moved: false,
    },
    event,
  )
}

const handleSessionPointerDown = (layout: TimeBoxDaySegmentLayout, event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  const slot = getPointerSlot(event.clientX, event.clientY)

  if (!slot) {
    return
  }

  event.stopPropagation()

  beginInteraction(
    {
      mode: 'move',
      timeBox: layout.timeBox,
      segmentStart: layout.segmentStart,
      pointerOffsetMinutes: slot.minutes - getMinutesSinceStartOfDay(layout.segmentStart),
      duplicate: event.altKey,
      moved: false,
    },
    event,
  )
}

const handleResizePointerDown = (timeBox: TimeBox, edge: 'start' | 'end', event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  event.stopPropagation()

  beginInteraction(
    {
      mode: 'resize',
      timeBox,
      edge,
      moved: false,
    },
    event,
  )
}

const setCalendarSurfaceRef = (el: unknown, dayIndex: number) => {
  if (dayIndex === 0) {
    calendarSurfaceRef.value = el instanceof HTMLElement ? el : null
  }
}

const setSevenThirtyLineRef = (el: unknown, dayIndex: number) => {
  if (dayIndex === 0) {
    sevenThirtyLineRef.value = el instanceof HTMLElement ? el : null
  }
}

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProject = (projectId: string) => props.projectById[projectId]

const getDurationBadgeStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectBadgeStyle(project.colors) : {}
}

/** During top/bottom resize, show the preview duration; otherwise the saved session duration. */
const getSessionDurationMinutes = (layout: TimeBoxDaySegmentLayout) => {
  const state = interactionState.value
  const preview = previewEvent.value

  if (state?.mode === 'resize' && state.moved && preview && state.timeBox.id === layout.timeBoxId) {
    const { startTime, endTime } = preview.input

    if (startTime && endTime) {
      return getTimeBoxDurationMinutes({ ...state.timeBox, startTime, endTime })
    }
  }

  return getTimeBoxDurationMinutes(layout.timeBox)
}

const formatHourLabel = (hour: number) =>
  new Date(2026, 0, 1, hour).toLocaleTimeString([], {
    hour: 'numeric',
  })

const formatDayHeader = (date: Date) =>
  visibleDays.value.length === 1
    ? date.toLocaleDateString([], { weekday: 'long' })
    : `${date.toLocaleDateString([], { weekday: 'short' })} ${date.getDate()}`

const weekHeaderStyle = computed(() => ({
  height: `${TIMED_WEEK_HEADER_HEIGHT_PX}px`,
}))

/** Week header: only “today” is visually distinct (stripes). No selected-day background. */
const getDayHeaderCellClass = (day: Date) => {
  if (isSameDay(day, now.value)) {
    return 'bg-surface-muted bg-[image:var(--background-image-calendar-day-today)]'
  }

  return 'bg-surface-muted'
}

const getEventStyle = (layout: TimeBoxDaySegmentLayout) => {
  const top = (getMinutesSinceStartOfDay(layout.segmentStart) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const height = Math.max(
    24,
    ((layout.segmentEnd.valueOf() - layout.segmentStart.valueOf()) / 86_400_000) * HOUR_HEIGHT * 24,
  )
  const width = `calc(${100 / layout.laneCount}% - 0.75rem)`
  const left = `calc(${(100 / layout.laneCount) * layout.lane}% + 0.375rem)`
  const project = getProject(layout.timeBox.project)

  return {
    top: `${top}px`,
    height: `${height}px`,
    left,
    width,
    ...(project ? getProjectSoftSurfaceStyle(project.colors) : {}),
  }
}

const previewStyle = computed(() => {
  const preview =
    previewEvent.value ??
    (props.createPreviewRange && interactionState.value?.mode !== 'create'
      ? {
          input: {
            startTime: props.createPreviewRange.startTime,
            endTime: props.createPreviewRange.endTime,
          },
          duplicate: false,
        }
      : null)

  if (!preview) {
    return null
  }

  const startDayIndex = visibleDays.value.findIndex((day) =>
    isSameDay(day, preview.input.startTime),
  )

  if (startDayIndex < 0) {
    return null
  }

  const top =
    (getMinutesSinceStartOfDay(preview.input.startTime) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const duration = preview.input.endTime.valueOf() - preview.input.startTime.valueOf()
  const height = Math.max(24, (duration / 86_400_000) * HOUR_HEIGHT * 24)

  return {
    dayIndex: startDayIndex,
    style: {
      top: `${top}px`,
      height: `${height}px`,
      left: '0.375rem',
      width: 'calc(100% - 0.75rem)',
    },
  }
})

const scrollAlignTo730 = async () => {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

  const scrollContainer = scrollContainerRef.value
  const marker = sevenThirtyLineRef.value

  if (!scrollContainer || !marker) {
    return
  }

  // Week view: body scroll starts below the day header row — align 7:30 to that row's bottom.
  // Day view: align to the sessions page header (scrollAlignTarget) as before.
  const targetY =
    isWeekView.value && weekHeaderRef.value
      ? weekHeaderRef.value.getBoundingClientRect().bottom
      : (props.scrollAlignTarget?.getBoundingClientRect().bottom ??
        scrollContainer.getBoundingClientRect().top)

  const delta = marker.getBoundingClientRect().top - targetY
  scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop + delta)
}

const handleDayHeaderClick = (day: Date) => {
  if (props.headerClickEnabled) {
    emit('openDay', day)
  }
}

/** Week view: single-click empty column (not a session) opens that day, same as the day header. */
const handleWeekColumnBackingClick = (day: Date, event: MouseEvent) => {
  if (!props.headerClickEnabled) {
    return
  }

  if (suppressNextWeekColumnBackingClick.value) {
    suppressNextWeekColumnBackingClick.value = false
    return
  }

  if (event.target !== event.currentTarget) {
    return
  }

  event.preventDefault()
  emit('openDay', day)
}

watch(
  () => visibleDays.value.map((day) => formatDateKey(day)).join('|'),
  () => {
    void scrollAlignTo730()
  },
  { immediate: true },
)

onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
  }

  stopInteraction()
})
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <!-- Day view: one scroll area; no sticky day header (panel top aligns with 12am). -->
    <div
      v-if="!isWeekView"
      ref="scrollContainerRef"
      class="h-full overflow-auto overscroll-contain px-6 py-6"
    >
      <ContainerCard
        ref="weekCalendarGridRef"
        class="grid min-h-full w-full overflow-hidden"
        padding="none"
        variant="subtle"
        :style="dayViewGridStyle"
      >
        <div class="relative border-r border-border bg-surface-muted">
          <div :style="{ height: `${HOUR_HEIGHT * 24}px` }">
            <div
              v-for="hour in hours"
              :key="hour"
              class="absolute inset-x-0 pr-3 text-right text-xs text-text-subtle"
              :class="{ 'border-t border-border-subtle': hour !== 0 }"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div v-if="hour !== 0" class="relative -top-2.5">{{ formatHourLabel(hour) }}</div>
            </div>
          </div>
        </div>

        <div
          v-for="(day, dayIndex) in visibleDays"
          :key="`${formatDateKey(day)}-column`"
          class="relative border-l border-border"
        >
          <div
            :ref="(el) => setCalendarSurfaceRef(el, dayIndex)"
            class="relative select-none"
            :class="{ 'bg-link/5': isWeekView && isSameDay(day, now) }"
            :style="{ height: `${HOUR_HEIGHT * 24}px` }"
            @pointerdown="handleCreatePointerDown"
          >
            <div
              v-if="dayIndex === 0"
              :ref="(el) => setSevenThirtyLineRef(el, dayIndex)"
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 z-0"
              :style="{ top: `${SEVEN_THIRTY_TOP_PX}px`, height: '0' }"
            ></div>

            <div
              v-for="hour in hours"
              :key="`${formatDateKey(day)}-${hour}`"
              class="pointer-events-none absolute inset-x-0"
              :class="{ 'border-t border-border-subtle': hour !== 0 }"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div class="absolute inset-x-0 top-1/2 border-t border-border-subtle/60"></div>
            </div>

            <div
              v-if="previewStyle && previewStyle.dayIndex === dayIndex"
              class="pointer-events-none absolute rounded-lg border border-dashed border-link bg-link/12"
              :style="previewStyle.style"
            ></div>

            <div
              v-if="nowMarker && nowMarker.dayIndex === dayIndex"
              class="pointer-events-none absolute inset-x-0 z-15 border-t-2 border-danger"
              :style="{ top: `${nowMarker.top}px` }"
            >
              <div
                class="absolute -top-2 left-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-text-inverse"
              >
                {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
              </div>
            </div>

            <div
              v-for="layout in dayLayouts[dayIndex]"
              :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
              class="absolute z-10 cursor-pointer rounded-lg border px-2 py-1 text-left text-text transition-[box-shadow,filter] duration-150 ease-out hover:z-20 hover:brightness-[1.02]"
              :class="{
                'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                  selectedSessionId === layout.timeBoxId,
                'shadow-panel': selectedSessionId !== layout.timeBoxId,
                'hover:shadow-[var(--shadow-panel-selected)]':
                  selectedSessionId !== layout.timeBoxId,
                'opacity-50':
                  interactionState?.mode === 'move' &&
                  interactionState.timeBox.id === layout.timeBoxId,
              }"
              :style="getEventStyle(layout)"
              @pointerdown="handleSessionPointerDown(layout, $event)"
            >
              <button
                v-if="layout.startsOnThisDay"
                type="button"
                class="absolute inset-x-0 -top-1.5 z-[11] h-3.5 cursor-ns-resize rounded-t-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
              ></button>

              <div
                class="pointer-events-none flex h-full min-h-0 items-start justify-between gap-2 overflow-hidden"
              >
                <div class="min-w-0 flex-1 truncate text-sm leading-none font-bold">
                  {{ getProjectName(layout.timeBox.project) }}
                </div>
                <DurationPill
                  format="minutes"
                  :minutes="getSessionDurationMinutes(layout)"
                  :style="getDurationBadgeStyle(layout.timeBox.project)"
                  tone="project"
                  variant="compact"
                />
              </div>

              <button
                v-if="layout.endsOnThisDay"
                type="button"
                class="absolute inset-x-0 -bottom-1.5 z-[11] h-3.5 cursor-ns-resize rounded-b-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
              ></button>
            </div>
          </div>
        </div>
      </ContainerCard>
    </div>

    <!-- Week view: fixed header row; hours + sessions scroll underneath. -->
    <div v-else class="flex h-full min-h-0 flex-col px-6 py-6">
      <ContainerCard
        class="flex min-h-0 flex-1 flex-col overflow-hidden"
        padding="none"
        variant="subtle"
      >
        <div ref="scrollContainerRef" class="min-h-0 flex-1 overflow-auto overscroll-contain">
          <div class="min-h-full" :style="{ minWidth: weekGridStyle.minWidth }">
            <div
              ref="weekHeaderRef"
              class="sticky top-0 z-20 grid border-b border-border bg-surface-muted"
              :style="weekGridStyle"
            >
              <div class="border-r border-border bg-surface-muted"></div>
              <component
                :is="headerClickEnabled ? 'button' : 'div'"
                v-for="day in visibleDays"
                :key="formatDateKey(day)"
                :type="headerClickEnabled ? 'button' : undefined"
                :style="weekHeaderStyle"
                :class="[
                  TIMED_WEEK_HEADER_CELL_CLASS_NAME,
                  getDayHeaderCellClass(day),
                  headerClickEnabled && 'cursor-pointer',
                  headerClickEnabled && isSameDay(day, now) && 'hover:bg-link/15',
                  headerClickEnabled && !isSameDay(day, now) && 'hover:bg-surface',
                ]"
                @click="handleDayHeaderClick(day)"
              >
                <div :class="CALENDAR_WEEKDAY_HEADER_LABEL_CLASS_NAME">
                  {{ formatDayHeader(day) }}
                </div>
              </component>
            </div>

            <div ref="weekCalendarGridRef" class="grid min-h-full w-full" :style="weekGridStyle">
              <div class="relative border-r border-border bg-surface-muted">
                <div :style="{ height: `${HOUR_HEIGHT * 24}px` }">
                  <div
                    v-for="hour in hours"
                    :key="hour"
                    class="absolute inset-x-0 pr-3 text-right text-xs text-text-subtle"
                    :class="{ 'border-t border-border-subtle': hour !== 0 }"
                    :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
                  >
                    <div class="relative -top-2.5">{{ formatHourLabel(hour) }}</div>
                  </div>
                </div>
              </div>

              <div
                v-for="(day, dayIndex) in visibleDays"
                :key="`${formatDateKey(day)}-column`"
                class="relative border-l border-border"
              >
                <div
                  :ref="(el) => setCalendarSurfaceRef(el, dayIndex)"
                  class="relative select-none"
                  :class="{ 'bg-link/5': isWeekView && isSameDay(day, now) }"
                  :style="{ height: `${HOUR_HEIGHT * 24}px` }"
                  @pointerdown="handleCreatePointerDown"
                  @click="handleWeekColumnBackingClick(day, $event)"
                >
                  <div
                    v-if="dayIndex === 0"
                    :ref="(el) => setSevenThirtyLineRef(el, dayIndex)"
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-x-0 z-0"
                    :style="{ top: `${SEVEN_THIRTY_TOP_PX}px`, height: '0' }"
                  ></div>

                  <div
                    v-for="hour in hours"
                    :key="`${formatDateKey(day)}-${hour}`"
                    class="pointer-events-none absolute inset-x-0"
                    :class="{ 'border-t border-border-subtle': hour !== 0 }"
                    :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
                  >
                    <div class="absolute inset-x-0 top-1/2 border-t border-border-subtle/60"></div>
                  </div>

                  <div
                    v-if="previewStyle && previewStyle.dayIndex === dayIndex"
                    class="pointer-events-none absolute rounded-lg border border-dashed border-link bg-link/12"
                    :style="previewStyle.style"
                  ></div>

                  <div
                    v-if="nowMarker && nowMarker.dayIndex === dayIndex"
                    class="pointer-events-none absolute inset-x-0 z-15 border-t-2 border-danger"
                    :style="{ top: `${nowMarker.top}px` }"
                  >
                    <div
                      class="absolute -top-2 left-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-text-inverse"
                    >
                      {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
                    </div>
                  </div>

                  <div
                    v-for="layout in dayLayouts[dayIndex]"
                    :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
                    class="absolute z-10 cursor-pointer rounded-lg border px-2 py-1 text-left text-text transition-[box-shadow,filter] duration-150 ease-out hover:z-20 hover:brightness-[1.02]"
                    :class="{
                      'shadow-panel-selected ring-1 ring-link/35 ring-inset':
                        selectedSessionId === layout.timeBoxId,
                      'shadow-panel': selectedSessionId !== layout.timeBoxId,
                      'hover:shadow-[var(--shadow-panel-selected)]':
                        selectedSessionId !== layout.timeBoxId,
                      'opacity-50':
                        interactionState?.mode === 'move' &&
                        interactionState.timeBox.id === layout.timeBoxId,
                    }"
                    :style="getEventStyle(layout)"
                    @pointerdown="handleSessionPointerDown(layout, $event)"
                  >
                    <button
                      v-if="layout.startsOnThisDay"
                      type="button"
                      class="absolute inset-x-0 -top-1.5 z-[11] h-3.5 cursor-ns-resize rounded-t-lg"
                      @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
                    ></button>

                    <div
                      class="pointer-events-none flex h-full min-h-0 items-start justify-between gap-2 overflow-hidden"
                    >
                      <div class="min-w-0 flex-1 truncate text-sm leading-none font-bold">
                        {{ getProjectName(layout.timeBox.project) }}
                      </div>
                      <DurationPill
                        format="minutes"
                        :minutes="getSessionDurationMinutes(layout)"
                        :style="getDurationBadgeStyle(layout.timeBox.project)"
                        tone="project"
                        variant="compact"
                      />
                    </div>

                    <button
                      v-if="layout.endsOnThisDay"
                      type="button"
                      class="absolute inset-x-0 -bottom-1.5 z-[11] h-3.5 cursor-ns-resize rounded-b-lg"
                      @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
                    ></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContainerCard>
    </div>
  </div>
</template>
