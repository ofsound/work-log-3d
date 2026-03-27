import type { ComputedRef } from 'vue'

import { computed, onMounted, ref, watch } from 'vue'

import { useMediaQuery } from '~/composables/useMediaQuery'
import type { SessionsRouteUpdateOptions } from '~/composables/useSessionsRouteState'
import type { SessionsViewMode } from '~/utils/sessions-route-state'
import type { TimeBox } from '~~/shared/worklog'
import {
  addMinutes,
  formatDateKey,
  formatToDatetimeLocal,
  getTimeBoxDurationMinutes,
  getTimeBoxesForDay,
  isSameDay,
  setTimeOnDate,
} from '~~/shared/worklog'

export interface SessionCreatePayload {
  startTime: Date
  endTime: Date
}

export interface SessionCreatePreview {
  range: SessionCreatePayload
  createdSessionId: string | null
}

export type DaySidebarTab = 'scratchpad' | 'overview'
export type PanelMode = 'closed' | DaySidebarTab | 'session' | 'create'

export interface UseSessionsPanelStateOptions {
  anchorDate: ComputedRef<Date>
  currentMode: ComputedRef<SessionsViewMode>
  resolvedTimeBoxes: ComputedRef<TimeBox[]>
  visibleCalendarTimeBoxes: ComputedRef<TimeBox[]>
  visibleDayTimeBoxes: ComputedRef<TimeBox[]>
  updateRouteState: (
    nextState: {
      mode?: SessionsViewMode
      date?: Date
    },
    options?: SessionsRouteUpdateOptions,
  ) => Promise<void>
}

export function useSessionsPanelState(options: UseSessionsPanelStateOptions) {
  const panelMode = ref<PanelMode>('closed')
  const panelSessionId = ref('')
  const selectedSessionId = ref('')
  const daySidebarTab = ref<DaySidebarTab>('scratchpad')
  const createRange = ref<SessionCreatePayload | null>(null)
  const createPreview = ref<SessionCreatePreview | null>(null)
  const sessionsHeaderRef = ref<HTMLElement | null>(null)
  const sessionsSidePanelRef = ref<{ flushScratchpad: () => Promise<void> } | null>(null)
  const hasMounted = ref(false)
  const isWideViewport = useMediaQuery('(min-width: 1024px)', false)

  const scratchpadDateKey = computed(() => formatDateKey(options.anchorDate.value))
  const isPersistentScratchpad = computed(
    () => options.currentMode.value === 'day' && hasMounted.value && isWideViewport.value,
  )
  const shouldOverlaySidePanel = computed(
    () =>
      isWideViewport.value &&
      (options.currentMode.value === 'week' || options.currentMode.value === 'month') &&
      panelMode.value !== 'closed',
  )
  const createInitialStartTime = computed(() =>
    createRange.value ? formatToDatetimeLocal(createRange.value.startTime) : '',
  )
  const createInitialEndTime = computed(() =>
    createRange.value ? formatToDatetimeLocal(createRange.value.endTime) : '',
  )
  const createPreviewRange = computed(() => createPreview.value?.range ?? null)

  const resetPanelState = (
    mode: PanelMode,
    stateOptions: {
      preserveCreatePreview?: boolean
      rememberDayTab?: boolean
    } = {},
  ) => {
    panelMode.value = mode
    panelSessionId.value = ''
    createRange.value = null

    if ((mode === 'scratchpad' || mode === 'overview') && stateOptions.rememberDayTab !== false) {
      daySidebarTab.value = mode
    }

    if (!stateOptions.preserveCreatePreview) {
      createPreview.value = null
    }
  }

  const flushScratchpadIfNeeded = async () => {
    if (!isPersistentScratchpad.value) {
      return
    }

    await sessionsSidePanelRef.value?.flushScratchpad()
  }

  const closePanel = async () => {
    await flushScratchpadIfNeeded()
    selectedSessionId.value = ''
    resetPanelState(isPersistentScratchpad.value ? daySidebarTab.value : 'closed', {
      rememberDayTab: false,
    })
  }

  const selectSession = (sessionId: string) => {
    selectedSessionId.value = sessionId
  }

  const openSessionPanel = async (
    sessionId: string,
    panelOptions: {
      preserveCreatePreview?: boolean
      day?: Date
    } = {},
  ) => {
    await flushScratchpadIfNeeded()

    if (!panelOptions.preserveCreatePreview) {
      createPreview.value = null
    }

    selectSession(sessionId)
    panelMode.value = 'session'
    panelSessionId.value = sessionId
    createRange.value = null

    if (panelOptions.day) {
      await options.updateRouteState({ date: panelOptions.day }, { history: 'push' })
    }
  }

  const openCreatePanel = async (range: SessionCreatePayload) => {
    createRange.value = range
    createPreview.value = {
      range,
      createdSessionId: null,
    }
    panelSessionId.value = ''
    selectedSessionId.value = ''
    await flushScratchpadIfNeeded()
    panelMode.value = 'create'
  }

  const markCreatePreviewSaved = (sessionId: string) => {
    if (!createPreview.value) {
      return
    }

    if (options.resolvedTimeBoxes.value.some((timeBox) => timeBox.id === sessionId)) {
      createPreview.value = null
      return
    }

    createPreview.value = {
      ...createPreview.value,
      createdSessionId: sessionId,
    }
  }

  const roundToSnapMinutes = (date: Date) => {
    const next = new Date(date.valueOf())
    next.setSeconds(0, 0)
    next.setMinutes(Math.round(next.getMinutes() / 10) * 10)
    return next
  }

  const getSelectedDayTimeBox = () =>
    options.visibleDayTimeBoxes.value.find((timeBox) => timeBox.id === selectedSessionId.value) ??
    null

  const openScratchpadPanel = async () => {
    if (!isPersistentScratchpad.value) {
      return
    }

    await flushScratchpadIfNeeded()
    selectedSessionId.value = ''
    resetPanelState('scratchpad')
  }

  const openOverviewPanel = async () => {
    if (!isPersistentScratchpad.value) {
      return
    }

    await flushScratchpadIfNeeded()
    selectedSessionId.value = ''
    resetPanelState('overview')
  }

  const backToOverlayOverviewPanel = async () => {
    await flushScratchpadIfNeeded()
    selectedSessionId.value = ''
    resetPanelState('overview', {
      rememberDayTab: false,
    })
  }

  const openSuggestedCreatePanel = async () => {
    const selectedTimeBox = getSelectedDayTimeBox()
    const defaultStart = isSameDay(options.anchorDate.value, new Date())
      ? roundToSnapMinutes(new Date())
      : setTimeOnDate(options.anchorDate.value, 9, 0)

    const startTime = selectedTimeBox?.startTime
      ? new Date(selectedTimeBox.startTime.valueOf())
      : defaultStart
    const durationMinutes = selectedTimeBox ? getTimeBoxDurationMinutes(selectedTimeBox) || 60 : 60

    await openCreatePanel({
      startTime,
      endTime: addMinutes(startTime, durationMinutes),
    })
  }

  const handleOpenDay = async (day: Date) => {
    await flushScratchpadIfNeeded()

    if (options.currentMode.value === 'month' || options.currentMode.value === 'week') {
      const dayBoxes = getTimeBoxesForDay(options.visibleCalendarTimeBoxes.value, day)

      if (dayBoxes.length === 0) {
        await closePanel()
        await options.updateRouteState({ date: day }, { history: 'push' })
        return
      }

      selectedSessionId.value = ''
      resetPanelState('overview')
      await options.updateRouteState({ date: day }, { history: 'push' })
      return
    }

    resetPanelState('closed')
    await options.updateRouteState({ mode: 'day', date: day }, { history: 'push' })
  }

  const moveDaySelection = (direction: -1 | 1) => {
    if (options.visibleDayTimeBoxes.value.length === 0) {
      return
    }

    const currentIndex = options.visibleDayTimeBoxes.value.findIndex(
      (timeBox) => timeBox.id === selectedSessionId.value,
    )

    if (currentIndex === -1) {
      selectSession(
        direction > 0
          ? options.visibleDayTimeBoxes.value[0]!.id
          : options.visibleDayTimeBoxes.value[options.visibleDayTimeBoxes.value.length - 1]!.id,
      )
      return
    }

    const nextIndex =
      (currentIndex + direction + options.visibleDayTimeBoxes.value.length) %
      options.visibleDayTimeBoxes.value.length

    selectSession(options.visibleDayTimeBoxes.value[nextIndex]!.id)
  }

  const applyCalendarEscapeDismiss = () => {
    if (isPersistentScratchpad.value) {
      if (panelMode.value !== 'scratchpad' || selectedSessionId.value) {
        if (daySidebarTab.value === 'overview') {
          void openOverviewPanel()
          return
        }

        void openScratchpadPanel()
      }

      return
    }

    if (panelMode.value !== 'closed') {
      void closePanel()
      return
    }

    selectedSessionId.value = ''
  }

  watch(
    () => [options.currentMode.value, isWideViewport.value, hasMounted.value],
    ([mode, wideViewport, mounted]) => {
      if (!mounted) {
        resetPanelState('closed')
        return
      }

      if (mode === 'day' && wideViewport) {
        if (panelMode.value === 'closed') {
          panelMode.value = daySidebarTab.value
        }

        return
      }

      if ((mode === 'month' || mode === 'week') && panelMode.value === 'overview') {
        return
      }

      if (panelMode.value === 'scratchpad' || panelMode.value === 'overview') {
        resetPanelState('closed')
      }
    },
    { immediate: true },
  )

  watch(
    () => [options.currentMode.value, options.anchorDate.value.valueOf()],
    () => {
      if (options.currentMode.value === 'day') {
        selectedSessionId.value = ''
        resetPanelState(isPersistentScratchpad.value ? daySidebarTab.value : 'closed', {
          rememberDayTab: false,
        })
      }
    },
  )

  watch(options.currentMode, (mode) => {
    if (mode === 'search' || mode === 'year') {
      resetPanelState('closed')
    }
  })

  watch(options.visibleDayTimeBoxes, (timeBoxes) => {
    if (
      options.currentMode.value === 'day' &&
      selectedSessionId.value &&
      !timeBoxes.some((timeBox) => timeBox.id === selectedSessionId.value)
    ) {
      selectedSessionId.value = ''
    }
  })

  watch(options.resolvedTimeBoxes, (timeBoxes) => {
    const preview = createPreview.value

    if (!preview?.createdSessionId) {
      return
    }

    if (timeBoxes.some((timeBox) => timeBox.id === preview.createdSessionId)) {
      createPreview.value = null
    }
  })

  onMounted(() => {
    hasMounted.value = true
  })

  return {
    applyCalendarEscapeDismiss,
    backToOverlayOverviewPanel,
    closePanel,
    createInitialEndTime,
    createInitialStartTime,
    createPreview,
    createPreviewRange,
    daySidebarTab,
    flushScratchpadIfNeeded,
    handleOpenDay,
    isPersistentScratchpad,
    isWideViewport,
    markCreatePreviewSaved,
    moveDaySelection,
    openCreatePanel,
    openOverviewPanel,
    openScratchpadPanel,
    openSessionPanel,
    openSuggestedCreatePanel,
    panelMode,
    panelSessionId,
    resetPanelState,
    scratchpadDateKey,
    selectedSessionId,
    selectSession,
    sessionsHeaderRef,
    sessionsSidePanelRef,
    shouldOverlaySidePanel,
  }
}
