<script setup lang="ts">
import type { PropType } from 'vue'

import { getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'
import {
  addMinutes,
  buildDaySegmentLayouts,
  buildWeekDays,
  formatDateKey,
  getEndOfWeek,
  getMinutesSinceStartOfDay,
  getStartOfDay,
  getStartOfWeek,
  isDateWithinRange,
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

const props = defineProps({
  anchorDate: { type: Date, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  selectedSessionId: { type: String, default: '' },
})

const emit = defineEmits(['openSession', 'openDay', 'createSession', 'changeSession'])

const HOUR_HEIGHT = 72
const HEADER_HEIGHT = 72
const TIME_GUTTER_WIDTH = 72
const DAY_COLUMN_WIDTH = 160
const SNAP_MINUTES = 10
const MINIMUM_DURATION_MINUTES = 10
const INTERACTION_THRESHOLD = 4

const scrollContainerRef = ref<HTMLElement | null>(null)
const now = ref(new Date())

let nowTimer: ReturnType<typeof setInterval> | undefined

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

const interactionState = ref<InteractionState | null>(null)
const pointerOrigin = ref({ x: 0, y: 0 })

const weekRange = computed(() => ({
  start: getStartOfWeek(props.anchorDate),
  end: getEndOfWeek(props.anchorDate),
}))

const weekDays = computed(() => buildWeekDays(props.anchorDate))

const hours = computed(() => Array.from({ length: 24 }, (_, index) => index))

const dayLayouts = computed(() =>
  weekDays.value.map((day) =>
    buildDaySegmentLayouts(
      props.timeBoxes.flatMap((timeBox) =>
        splitTimeBoxIntoDaySegments(timeBox, weekRange.value).filter((segment) =>
          isSameDay(segment.dayStart, day),
        ),
      ),
    ),
  ),
)

const todayVisible = computed(() => isDateWithinRange(now.value, weekRange.value))

const nowMarker = computed(() => {
  if (!todayVisible.value) {
    return null
  }

  const dayIndex = weekDays.value.findIndex((day) => isSameDay(day, now.value))

  if (dayIndex < 0) {
    return null
  }

  return {
    dayIndex,
    top: (getMinutesSinceStartOfDay(now.value) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24,
  }
})

const previewEvent = computed(() => {
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
    const slot = getLastPointerSlot()

    if (!slot) {
      return null
    }

    const nextSegmentStart = addMinutes(
      getStartOfDay(weekDays.value[slot.dayIndex]!),
      slot.minutes - state.pointerOffsetMinutes,
    )
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )
    const nextStart = addMinutes(nextSegmentStart, -segmentDeltaMinutes)

    return {
      input: moveTimeBoxToStart(state.timeBox, nextStart),
      duplicate: state.duplicate,
    }
  }

  const slot = getLastPointerSlot()

  if (!slot) {
    return null
  }

  const nextDate = addMinutes(getStartOfDay(weekDays.value[slot.dayIndex]!), slot.minutes)

  return {
    input:
      state.edge === 'start'
        ? resizeTimeBoxStart(state.timeBox, clampResizeStart(state.timeBox, nextDate))
        : resizeTimeBoxEnd(state.timeBox, clampResizeEnd(state.timeBox, nextDate)),
    duplicate: false,
  }
})

const lastPointerSlot = ref<{ dayIndex: number; minutes: number } | null>(null)

const getLastPointerSlot = () => lastPointerSlot.value

const createDateForSlot = (dayIndex: number, minutes: number) =>
  addMinutes(getStartOfDay(weekDays.value[dayIndex]!), minutes)

const clampMinutes = (minutes: number) => {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return Math.min(MINUTES_PER_DAY, Math.max(0, snapped))
}

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

const enforceMinimumEnd = (startTime: Date, endTime: Date) =>
  endTime.valueOf() - startTime.valueOf() < MINIMUM_DURATION_MINUTES * 60_000
    ? addMinutes(startTime, MINIMUM_DURATION_MINUTES)
    : endTime

const getPointerSlot = (clientX: number, clientY: number) => {
  const scrollContainer = scrollContainerRef.value

  if (!scrollContainer) {
    return null
  }

  const rect = scrollContainer.getBoundingClientRect()
  const offsetX = clientX - rect.left + scrollContainer.scrollLeft - TIME_GUTTER_WIDTH
  const offsetY = clientY - rect.top + scrollContainer.scrollTop - HEADER_HEIGHT

  if (offsetX < 0 || offsetY < 0) {
    return null
  }

  const dayIndex = Math.min(
    weekDays.value.length - 1,
    Math.max(0, Math.floor(offsetX / DAY_COLUMN_WIDTH)),
  )
  const minutes = clampMinutes((offsetY / (HOUR_HEIGHT * 24)) * MINUTES_PER_DAY)

  return { dayIndex, minutes }
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
    state.moved = state.moved || markInteractionMoved(event)
    return
  }

  state.moved = state.moved || markInteractionMoved(event)
}

const stopInteraction = () => {
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
}

const handleWindowPointerMove = (event: PointerEvent) => {
  updatePointerState(event)
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
      return
    }

    const startSlot = createDateForSlot(state.startDayIndex, state.startMinutes)
    const endSlot = createDateForSlot(state.currentDayIndex, state.currentMinutes)
    const startTime = startSlot.valueOf() <= endSlot.valueOf() ? startSlot : endSlot
    const endTime = startSlot.valueOf() <= endSlot.valueOf() ? endSlot : startSlot

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
      getStartOfDay(weekDays.value[slot.dayIndex]!),
      slot.minutes - state.pointerOffsetMinutes,
    )
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )
    const nextStart = addMinutes(nextSegmentStart, -segmentDeltaMinutes)

    emit('changeSession', {
      id: state.timeBox.id,
      input: moveTimeBoxToStart(state.timeBox, nextStart),
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

  const nextDate = addMinutes(getStartOfDay(weekDays.value[slot.dayIndex]!), slot.minutes)

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

const handleCreatePointerDown = (dayIndex: number, event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  const slot = getPointerSlot(event.clientX, event.clientY)

  if (!slot) {
    return
  }

  beginInteraction(
    {
      mode: 'create',
      startDayIndex: dayIndex,
      startMinutes: slot.minutes,
      currentDayIndex: dayIndex,
      currentMinutes: slot.minutes,
      moved: false,
    },
    event,
  )
}

const handleSessionPointerDown = (
  layout: (typeof dayLayouts.value)[number][number],
  event: PointerEvent,
) => {
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

const getProjectName = (projectId: string) => props.projectNameById[projectId] ?? 'Untitled'
const getProject = (projectId: string) => props.projectById[projectId]

const formatHourLabel = (hour: number) =>
  new Date(2026, 0, 1, hour).toLocaleTimeString([], {
    hour: 'numeric',
  })

const formatDayHeader = (date: Date) =>
  date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
  })

const formatEventTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const getEventStyle = (layout: (typeof dayLayouts.value)[number][number]) => {
  const top = (getMinutesSinceStartOfDay(layout.segmentStart) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const height = Math.max(
    22,
    ((layout.segmentEnd.valueOf() - layout.segmentStart.valueOf()) / 86_400_000) * HOUR_HEIGHT * 24,
  )
  const width = `calc(${100 / layout.laneCount}% - 0.4rem)`
  const left = `calc(${(100 / layout.laneCount) * layout.lane}% + 0.2rem)`
  const project = getProject(layout.timeBox.project)

  return {
    top: `${top}px`,
    height: `${height}px`,
    left,
    width,
    ...(project ? getProjectSoftSurfaceStyle(project.colors) : {}),
  }
}

const getPreviewStyle = () => {
  const preview = previewEvent.value

  if (!preview) {
    return null
  }

  const startDayIndex = weekDays.value.findIndex((day) => isSameDay(day, preview.input.startTime))

  if (startDayIndex < 0) {
    return null
  }

  const top =
    (getMinutesSinceStartOfDay(preview.input.startTime) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const duration = preview.input.endTime.valueOf() - preview.input.startTime.valueOf()
  const height = Math.max(22, (duration / 86_400_000) * HOUR_HEIGHT * 24)

  return {
    dayIndex: startDayIndex,
    style: {
      top: `${top}px`,
      height: `${height}px`,
      left: '0.2rem',
      width: 'calc(100% - 0.4rem)',
    },
  }
}

const previewStyle = computed(() => getPreviewStyle())

watch(
  () => formatDateKey(props.anchorDate),
  async () => {
    await nextTick()

    const scrollContainer = scrollContainerRef.value

    if (!scrollContainer || !todayVisible.value) {
      return
    }

    const targetTop = Math.max(
      0,
      (getMinutesSinceStartOfDay(now.value) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24 - 220,
    )
    scrollContainer.scrollTop = targetTop
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
  <div
    class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
  >
    <div ref="scrollContainerRef" class="h-full overflow-auto">
      <div
        class="grid min-h-full"
        :style="{
          gridTemplateColumns: `${TIME_GUTTER_WIDTH}px repeat(7, ${DAY_COLUMN_WIDTH}px)`,
          minWidth: `${TIME_GUTTER_WIDTH + DAY_COLUMN_WIDTH * 7}px`,
        }"
      >
        <div class="sticky top-0 z-30 border-b border-border bg-surface"></div>
        <button
          v-for="day in weekDays"
          :key="formatDateKey(day)"
          class="sticky top-0 z-20 flex h-18 cursor-pointer flex-col items-start justify-center border-b border-l border-border bg-surface px-4 text-left hover:bg-surface-muted"
          :class="{
            'bg-surface-muted': isSameDay(day, anchorDate),
            'text-link': isSameDay(day, now),
          }"
          @click="emit('openDay', day)"
        >
          <div class="text-xs tracking-[0.2em] text-text-subtle uppercase">Day</div>
          <div class="text-lg font-semibold">{{ formatDayHeader(day) }}</div>
          <div v-if="isSameDay(day, now)" class="text-xs font-semibold text-danger">Today</div>
          <div v-else class="text-xs text-text-subtle">Week view</div>
        </button>

        <div class="relative border-r border-border bg-surface-muted">
          <div :style="{ height: `${HOUR_HEIGHT * 24}px` }">
            <div
              v-for="hour in hours"
              :key="hour"
              class="absolute inset-x-0 border-t border-border-subtle pr-3 text-right text-xs text-text-subtle"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div class="relative -top-2.5">{{ formatHourLabel(hour) }}</div>
            </div>
          </div>
        </div>

        <div
          v-for="(day, dayIndex) in weekDays"
          :key="`${formatDateKey(day)}-column`"
          class="relative border-l border-border"
        >
          <div
            class="relative select-none"
            :class="{ 'bg-surface-muted/40': isSameDay(day, now) }"
            :style="{ height: `${HOUR_HEIGHT * 24}px` }"
            @pointerdown="handleCreatePointerDown(dayIndex, $event)"
          >
            <div
              v-for="hour in hours"
              :key="`${formatDateKey(day)}-${hour}`"
              class="pointer-events-none absolute inset-x-0 border-t border-border-subtle"
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
                class="absolute -top-2 left-0 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white"
              >
                {{ now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }}
              </div>
            </div>

            <div
              v-for="layout in dayLayouts[dayIndex]"
              :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
              class="absolute z-10 cursor-pointer rounded-lg border px-2 py-1 text-left text-text shadow-panel transition hover:brightness-97"
              :class="{
                'ring-2 ring-link': selectedSessionId === layout.timeBoxId,
                'opacity-50':
                  interactionState?.mode === 'move' &&
                  interactionState.timeBox.id === layout.timeBoxId,
              }"
              :style="getEventStyle(layout)"
              @pointerdown="handleSessionPointerDown(layout, $event)"
            >
              <button
                v-if="layout.startsOnThisDay"
                class="absolute inset-x-0 top-0 h-2 cursor-ns-resize rounded-t-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
              ></button>
              <div class="pointer-events-none">
                <div
                  class="truncate text-[11px] font-semibold tracking-[0.16em] uppercase opacity-70"
                >
                  {{ formatEventTime(layout.segmentStart) }}
                </div>
                <div class="truncate text-sm font-semibold">
                  {{ getProjectName(layout.timeBox.project) }}
                </div>
                <div class="truncate text-xs opacity-80">
                  {{ layout.timeBox.notes }}
                </div>
              </div>
              <button
                v-if="layout.endsOnThisDay"
                class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-lg"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
