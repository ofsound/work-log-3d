<script setup lang="ts">
import type { PropType } from 'vue'

import { getProjectBadgeStyle, getProjectSoftSurfaceStyle } from '~/utils/project-color-styles'
import type { Project, TimeBox, TimeBoxInput } from '~~/shared/worklog'
import {
  addMinutes,
  buildDaySegmentLayouts,
  getDayRange,
  getDurationMinutesLabel,
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

const props = defineProps({
  anchorDate: { type: Date, required: true },
  timeBoxes: { type: Array as PropType<TimeBox[]>, default: () => [] },
  projectById: { type: Object as PropType<Record<string, Project>>, default: () => ({}) },
  projectNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  tagNameById: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  hideTags: { type: Boolean, default: false },
  selectedSessionId: { type: String, default: '' },
})

const emit = defineEmits(['openSession', 'createSession', 'changeSession'])

const HOUR_HEIGHT = 72
const HEADER_HEIGHT = 24
const TIME_GUTTER_WIDTH = 72
const SNAP_MINUTES = 10
const MINIMUM_DURATION_MINUTES = 10
const INTERACTION_THRESHOLD = 4

type InteractionState =
  | {
      mode: 'create'
      startMinutes: number
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
const interactionState = ref<InteractionState | null>(null)
const lastPointerMinutes = ref<number | null>(null)
const pointerOrigin = ref({ x: 0, y: 0 })
const now = ref(new Date())

let nowTimer: ReturnType<typeof setInterval> | undefined

const dayRange = computed(() => getDayRange(props.anchorDate))
const hours = computed(() => Array.from({ length: 24 }, (_, index) => index))

const dayLayouts = computed(() =>
  buildDaySegmentLayouts(
    props.timeBoxes.flatMap((timeBox) => splitTimeBoxIntoDaySegments(timeBox, dayRange.value)),
  ),
)

const nowMarker = computed(() => {
  if (!isSameDay(props.anchorDate, now.value)) {
    return null
  }

  return {
    top: (getMinutesSinceStartOfDay(now.value) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24,
  }
})

const previewEvent = computed(() => {
  const state = interactionState.value

  if (!state || !state.moved) {
    return null
  }

  if (state.mode === 'create') {
    const startTime = createDateForMinutes(Math.min(state.startMinutes, state.currentMinutes))
    const endTime = enforceMinimumEnd(
      startTime,
      createDateForMinutes(Math.max(state.startMinutes, state.currentMinutes)),
    )

    return { startTime, endTime }
  }

  if (state.mode === 'move') {
    const minutes = lastPointerMinutes.value

    if (minutes === null) {
      return null
    }

    const nextSegmentStart = createDateForMinutes(minutes - state.pointerOffsetMinutes)
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )

    return moveTimeBoxToStart(state.timeBox, addMinutes(nextSegmentStart, -segmentDeltaMinutes))
  }

  const minutes = lastPointerMinutes.value

  if (minutes === null) {
    return null
  }

  const nextDate = createDateForMinutes(minutes)

  return state.edge === 'start'
    ? resizeTimeBoxStart(state.timeBox, clampResizeStart(state.timeBox, nextDate))
    : resizeTimeBoxEnd(state.timeBox, clampResizeEnd(state.timeBox, nextDate))
})

const createDateForMinutes = (minutes: number) =>
  addMinutes(getStartOfDay(props.anchorDate), minutes)

const clampMinutes = (minutes: number) => {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return Math.min(MINUTES_PER_DAY, Math.max(0, snapped))
}

const getPointerMinutes = (clientY: number) => {
  const scrollContainer = scrollContainerRef.value

  if (!scrollContainer) {
    return null
  }

  const rect = scrollContainer.getBoundingClientRect()
  const offsetY = clientY - rect.top + scrollContainer.scrollTop - HEADER_HEIGHT

  if (offsetY < 0) {
    return null
  }

  return clampMinutes((offsetY / (HOUR_HEIGHT * 24)) * MINUTES_PER_DAY)
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

const markInteractionMoved = (event: PointerEvent) => {
  const deltaX = Math.abs(event.clientX - pointerOrigin.value.x)
  const deltaY = Math.abs(event.clientY - pointerOrigin.value.y)

  return deltaX > INTERACTION_THRESHOLD || deltaY > INTERACTION_THRESHOLD
}

const updatePointerState = (event: PointerEvent) => {
  const minutes = getPointerMinutes(event.clientY)

  if (minutes === null) {
    return
  }

  lastPointerMinutes.value = minutes

  if (!interactionState.value) {
    return
  }

  if (interactionState.value.mode === 'create') {
    interactionState.value.currentMinutes = minutes
  }

  interactionState.value.moved = interactionState.value.moved || markInteractionMoved(event)
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

    const startTime = createDateForMinutes(Math.min(state.startMinutes, state.currentMinutes))
    const endTime = enforceMinimumEnd(
      startTime,
      createDateForMinutes(Math.max(state.startMinutes, state.currentMinutes)),
    )

    emit('createSession', { startTime, endTime })
    return
  }

  if (state.mode === 'move') {
    if (!state.moved) {
      emit('openSession', state.timeBox.id)
      return
    }

    const minutes = getPointerMinutes(event.clientY)

    if (minutes === null) {
      return
    }

    const nextSegmentStart = createDateForMinutes(minutes - state.pointerOffsetMinutes)
    const segmentDeltaMinutes = Math.round(
      (state.segmentStart.valueOf() - (state.timeBox.startTime?.valueOf() ?? 0)) / 60_000,
    )

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

  const minutes = getPointerMinutes(event.clientY)

  if (minutes === null) {
    return
  }

  const nextDate = createDateForMinutes(minutes)

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
  lastPointerMinutes.value = getPointerMinutes(event.clientY)

  window.addEventListener('pointermove', handleWindowPointerMove)
  window.addEventListener('pointerup', handleWindowPointerUp)
}

const handleCreatePointerDown = (event: PointerEvent) => {
  if (event.button !== 0) {
    return
  }

  const minutes = getPointerMinutes(event.clientY)

  if (minutes === null) {
    return
  }

  beginInteraction(
    {
      mode: 'create',
      startMinutes: minutes,
      currentMinutes: minutes,
      moved: false,
    },
    event,
  )
}

const handleSessionPointerDown = (
  layout: (typeof dayLayouts.value)[number],
  event: PointerEvent,
) => {
  if (event.button !== 0) {
    return
  }

  const minutes = getPointerMinutes(event.clientY)

  if (minutes === null) {
    return
  }

  event.stopPropagation()

  beginInteraction(
    {
      mode: 'move',
      timeBox: layout.timeBox,
      segmentStart: layout.segmentStart,
      pointerOffsetMinutes: minutes - getMinutesSinceStartOfDay(layout.segmentStart),
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

const getTagNames = (tagIds: string[]) =>
  tagIds.map((tagId) => props.tagNameById[tagId]).filter(Boolean)

const formatHourLabel = (hour: number) =>
  new Date(2026, 0, 1, hour).toLocaleTimeString([], {
    hour: 'numeric',
  })

const formatEventTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

const getEventStyle = (layout: (typeof dayLayouts.value)[number]) => {
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

const getPreviewStyle = () => {
  const preview = previewEvent.value

  if (!preview) {
    return null
  }

  const top = (getMinutesSinceStartOfDay(preview.startTime) / MINUTES_PER_DAY) * HOUR_HEIGHT * 24
  const height = Math.max(
    24,
    ((preview.endTime.valueOf() - preview.startTime.valueOf()) / 86_400_000) * HOUR_HEIGHT * 24,
  )

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: '0.375rem',
    width: 'calc(100% - 0.75rem)',
  }
}

const getLayoutDensity = (layout: (typeof dayLayouts.value)[number]) => {
  const minutes = (layout.segmentEnd.valueOf() - layout.segmentStart.valueOf()) / 60_000

  if (layout.laneCount >= 3 || minutes < 25) {
    return 'compact'
  }

  if (layout.laneCount === 2 || minutes < 55) {
    return 'medium'
  }

  return 'full'
}

const previewStyle = computed(() => getPreviewStyle())
const getDurationBadgeStyle = (projectId: string) => {
  const project = getProject(projectId)

  return project ? getProjectBadgeStyle(project.colors) : {}
}

watch(
  () => props.anchorDate.valueOf(),
  async () => {
    await nextTick()

    const scrollContainer = scrollContainerRef.value

    if (!scrollContainer) {
      return
    }

    const firstEvent = dayLayouts.value[0]
    const targetMinutes = isSameDay(props.anchorDate, now.value)
      ? getMinutesSinceStartOfDay(now.value)
      : firstEvent
        ? getMinutesSinceStartOfDay(firstEvent.segmentStart)
        : 8 * 60

    scrollContainer.scrollTop = Math.max(
      0,
      (targetMinutes / MINUTES_PER_DAY) * HOUR_HEIGHT * 24 - 220,
    )
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
          gridTemplateColumns: `${TIME_GUTTER_WIDTH}px minmax(0, 1fr)`,
          minWidth: `${TIME_GUTTER_WIDTH + 720}px`,
        }"
      >
        <div class="border-b border-border bg-surface"></div>
        <div class="border-b border-l border-border bg-surface px-5 py-3">
          <div class="text-xs tracking-[0.2em] text-text-subtle uppercase">
            {{ anchorDate.toLocaleDateString([], { weekday: 'long' }) }}
          </div>
          <div class="text-xl font-semibold">
            {{ anchorDate.toLocaleDateString([], { month: 'long', day: 'numeric' }) }}
          </div>
        </div>

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

        <div class="relative border-l border-border">
          <div
            class="relative select-none"
            :class="{ 'bg-surface-muted/30': isSameDay(anchorDate, now) }"
            :style="{ height: `${HOUR_HEIGHT * 24}px` }"
            @pointerdown="handleCreatePointerDown"
          >
            <div
              v-for="hour in hours"
              :key="`${hour}-day`"
              class="pointer-events-none absolute inset-x-0 border-t border-border-subtle"
              :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }"
            >
              <div class="absolute inset-x-0 top-1/2 border-t border-border-subtle/60"></div>
            </div>

            <div
              v-if="previewStyle"
              class="pointer-events-none absolute rounded-xl border border-dashed border-link bg-link/12"
              :style="previewStyle"
            ></div>

            <div
              v-if="nowMarker"
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
              v-for="layout in dayLayouts"
              :key="`${layout.timeBoxId}-${layout.segmentStart.valueOf()}`"
              class="absolute z-10 cursor-pointer rounded-2xl border px-4 py-3 text-left text-text shadow-panel transition hover:brightness-97"
              :class="{ 'ring-2 ring-link': selectedSessionId === layout.timeBoxId }"
              :style="getEventStyle(layout)"
              @pointerdown="handleSessionPointerDown(layout, $event)"
            >
              <button
                v-if="layout.startsOnThisDay"
                class="absolute inset-x-0 top-0 h-2 cursor-ns-resize rounded-t-2xl"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'start', $event)"
              ></button>

              <div class="pointer-events-none flex h-full flex-col">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-xs tracking-[0.18em] uppercase opacity-70">
                      {{ formatEventTime(layout.segmentStart) }} -
                      {{ formatEventTime(layout.segmentEnd) }}
                    </div>
                    <div class="mt-1 text-sm font-bold sm:text-lg">
                      {{ getProjectName(layout.timeBox.project) }}
                    </div>
                  </div>
                  <div
                    class="rounded-full border px-2 py-0.5 text-xs font-semibold"
                    :style="getDurationBadgeStyle(layout.timeBox.project)"
                  >
                    {{ getDurationMinutesLabel(layout.timeBox) }}
                  </div>
                </div>

                <div
                  v-if="getLayoutDensity(layout) !== 'compact'"
                  class="mt-2 line-clamp-4 text-sm leading-relaxed opacity-85"
                >
                  {{ layout.timeBox.notes }}
                </div>

                <div
                  v-if="!hideTags && getLayoutDensity(layout) === 'full'"
                  class="mt-3 flex flex-wrap gap-2"
                >
                  <div
                    v-for="tagName in getTagNames(layout.timeBox.tags)"
                    :key="tagName"
                    class="rounded-full bg-white/55 px-2 py-0.5 text-xs font-medium dark:bg-black/20"
                  >
                    {{ tagName }}
                  </div>
                </div>

                <div
                  v-if="getLayoutDensity(layout) === 'compact'"
                  class="mt-2 truncate text-xs opacity-80"
                >
                  {{ layout.timeBox.notes }}
                </div>
              </div>

              <button
                v-if="layout.endsOnThisDay"
                class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-2xl"
                @pointerdown="handleResizePointerDown(layout.timeBox, 'end', $event)"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
