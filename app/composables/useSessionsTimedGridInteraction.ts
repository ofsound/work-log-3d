import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  getMinutesSinceStartOfDay,
  getStartOfDay,
  getTimeBoxDurationMinutes,
  isSameDay,
  MINUTES_PER_DAY,
  moveTimeBoxToStart,
  resizeTimeBoxEnd,
  resizeTimeBoxStart,
  splitTimeBoxIntoDaySegments,
} from '~~/shared/worklog'

export interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

interface PreviewEvent {
  input: Pick<TimeBoxInput, 'startTime' | 'endTime'>
  duplicate: boolean
}

export interface SessionCreateRange {
  startTime: Date
  endTime: Date
}

export interface SessionsTimedGridProps {
  activeDate: Date
  createPreviewRange: SessionCreateRange | null
  days: Date[]
  timeBoxes: TimeBox[]
  projectById: Record<string, Project>
  projectNameById: Record<string, string>
  selectedSessionId: string
  scrollAlignTarget: HTMLElement | null
  headerClickEnabled: boolean
}

export interface UseSessionsTimedGridInteractionOptions {
  hourHeight: number
  interactionThreshold: number
  minimumDurationMinutes: number
  props: SessionsTimedGridProps
  snapMinutes: number
  timeGutterWidth: number
  onChangeSession: (payload: SessionChangePayload) => void
  onCreateSession: (payload: SessionCreateRange) => void
  onDismissCalendar: () => void
  onOpenDay: (day: Date) => void
  onOpenScratchpad: () => void
  onOpenSession: (sessionId: string) => void
}

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

export function useSessionsTimedGridInteraction(options: UseSessionsTimedGridInteractionOptions) {
  const scrollContainerRef = ref<HTMLElement | null>(null)
  const weekHeaderRef = ref<HTMLElement | null>(null)
  const weekCalendarGridRef = ref<HTMLElement | null>(null)
  const calendarSurfaceRef = ref<HTMLElement | null>(null)
  const sevenThirtyLineRef = ref<HTMLElement | null>(null)
  const interactionState = ref<InteractionState | null>(null)
  const suppressNextWeekColumnBackingClick = ref(false)
  const lastPointerSlot = ref<{ dayIndex: number; minutes: number } | null>(null)
  const pointerOrigin = ref({ x: 0, y: 0 })
  const now = ref(new Date())

  let nowTimer: ReturnType<typeof setInterval> | undefined

  const visibleDays = computed(() =>
    options.props.days.length > 0 ? options.props.days : [options.props.activeDate],
  )
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

  const segmentsByDayKey = computed(() => {
    const map = new Map<string, TimeBoxDaySegment[]>()

    options.props.timeBoxes.forEach((timeBox) => {
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
      top: (getMinutesSinceStartOfDay(now.value) / MINUTES_PER_DAY) * options.hourHeight * 24,
    }
  })

  const createDateForSlot = (dayIndex: number, minutes: number) =>
    addMinutes(getStartOfDay(visibleDays.value[dayIndex] ?? options.props.activeDate), minutes)

  const clampMinutes = (minutes: number) => {
    const snapped = Math.round(minutes / options.snapMinutes) * options.snapMinutes
    return Math.min(MINUTES_PER_DAY, Math.max(0, snapped))
  }

  const enforceMinimumEnd = (startTime: Date, endTime: Date) =>
    endTime.valueOf() - startTime.valueOf() < options.minimumDurationMinutes * 60_000
      ? addMinutes(startTime, options.minimumDurationMinutes)
      : endTime

  const clampResizeStart = (timeBox: TimeBox, value: Date) => {
    const endTime = timeBox.endTime ?? addMinutes(value, options.minimumDurationMinutes)
    const latestAllowed = addMinutes(endTime, -options.minimumDurationMinutes)

    return value.valueOf() >= latestAllowed.valueOf() ? latestAllowed : value
  }

  const clampResizeEnd = (timeBox: TimeBox, value: Date) => {
    const startTime = timeBox.startTime ?? addMinutes(value, -options.minimumDurationMinutes)
    const earliestAllowed = addMinutes(startTime, options.minimumDurationMinutes)

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

    const minutes = clampMinutes((offsetY / (options.hourHeight * 24)) * MINUTES_PER_DAY)

    if (visibleDays.value.length === 1) {
      return { dayIndex: 0, minutes }
    }

    const grid = weekCalendarGridRef.value

    if (!grid) {
      return null
    }

    const gridRect = grid.getBoundingClientRect()
    const relativeX = clientX - gridRect.left - options.timeGutterWidth
    const dayAreaWidth = Math.max(0, gridRect.width - options.timeGutterWidth)
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

    return deltaX > options.interactionThreshold || deltaY > options.interactionThreshold
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
        input: moveTimeBoxToStart(
          state.timeBox,
          addMinutes(nextSegmentStart, -segmentDeltaMinutes),
        ),
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
          options.onDismissCalendar()
        } else {
          options.onOpenScratchpad()
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

      options.onCreateSession({
        startTime,
        endTime: enforceMinimumEnd(startTime, endTime),
      })
      return
    }

    if (state.mode === 'move') {
      if (!state.moved) {
        options.onOpenSession(state.timeBox.id)
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

      options.onChangeSession({
        id: state.timeBox.id,
        input: moveTimeBoxToStart(
          state.timeBox,
          addMinutes(nextSegmentStart, -segmentDeltaMinutes),
        ),
        duplicate: state.duplicate,
      })
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

    options.onChangeSession({
      id: state.timeBox.id,
      input:
        state.edge === 'start'
          ? resizeTimeBoxStart(state.timeBox, clampResizeStart(state.timeBox, nextDate))
          : resizeTimeBoxEnd(state.timeBox, clampResizeEnd(state.timeBox, nextDate)),
      duplicate: false,
    })
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

  const handleResizePointerDown = (
    timeBox: TimeBox,
    edge: 'start' | 'end',
    event: PointerEvent,
  ) => {
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

  const getSessionDurationMinutes = (layout: TimeBoxDaySegmentLayout) => {
    const state = interactionState.value
    const preview = previewEvent.value

    if (
      state?.mode === 'resize' &&
      state.moved &&
      preview &&
      state.timeBox.id === layout.timeBoxId
    ) {
      const { startTime, endTime } = preview.input

      if (startTime && endTime) {
        return getTimeBoxDurationMinutes({ ...state.timeBox, startTime, endTime })
      }
    }

    return getTimeBoxDurationMinutes(layout.timeBox)
  }

  const previewStyle = computed(() => {
    const preview =
      previewEvent.value ??
      (options.props.createPreviewRange && interactionState.value?.mode !== 'create'
        ? {
            input: {
              startTime: options.props.createPreviewRange.startTime,
              endTime: options.props.createPreviewRange.endTime,
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
      (getMinutesSinceStartOfDay(preview.input.startTime) / MINUTES_PER_DAY) *
      options.hourHeight *
      24
    const duration = preview.input.endTime.valueOf() - preview.input.startTime.valueOf()
    const height = Math.max(24, (duration / 86_400_000) * options.hourHeight * 24)

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

    const targetY =
      isWeekView.value && weekHeaderRef.value
        ? weekHeaderRef.value.getBoundingClientRect().bottom
        : (options.props.scrollAlignTarget?.getBoundingClientRect().bottom ??
          scrollContainer.getBoundingClientRect().top)

    const delta = marker.getBoundingClientRect().top - targetY
    scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop + delta)
  }

  const handleDayHeaderClick = (day: Date) => {
    if (options.props.headerClickEnabled) {
      options.onOpenDay(day)
    }
  }

  const handleWeekColumnBackingClick = (day: Date, event: MouseEvent) => {
    if (!options.props.headerClickEnabled) {
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
    options.onOpenDay(day)
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

  return {
    dayLayouts,
    getSessionDurationMinutes,
    handleCreatePointerDown,
    handleDayHeaderClick,
    handleResizePointerDown,
    handleSessionPointerDown,
    handleWeekColumnBackingClick,
    hours,
    interactionState,
    isWeekView,
    now,
    nowMarker,
    previewStyle,
    scrollContainerRef,
    setCalendarSurfaceRef,
    setSevenThirtyLineRef,
    visibleDays,
    weekCalendarGridRef,
    weekHeaderRef,
  }
}
