// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, ref } from 'vue'

import type { SessionsViewMode } from '~/app/utils/sessions-route-state'
import type { TimeBox } from '~~/shared/worklog'

const mediaMatches = ref(true)

vi.mock('~/composables/useMediaQuery', () => ({
  useMediaQuery: () => mediaMatches,
}))

const { useSessionsPanelState } = await import('~/app/composables/useSessionsPanelState')

const flushPendingWork = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const anchorDateValue = new Date(2026, 2, 23)
const nextDay = new Date(2026, 2, 24)

const buildTimeBox = (
  id: string,
  startTime: Date,
  endTime: Date,
  overrides: Partial<TimeBox> = {},
): TimeBox => ({
  id,
  notes: '',
  project: 'project-1',
  tags: [],
  startTime,
  endTime,
  ...overrides,
})

const mountHarness = (initialMode: SessionsViewMode = 'day') => {
  let state: ReturnType<typeof useSessionsPanelState> | null = null

  const anchorDate = ref(anchorDateValue)
  const currentMode = ref<SessionsViewMode>(initialMode)
  const resolvedTimeBoxes = ref<TimeBox[]>([])
  const visibleCalendarTimeBoxes = ref<TimeBox[]>([])
  const visibleDayTimeBoxes = ref<TimeBox[]>([
    buildTimeBox('session-1', new Date(2026, 2, 23, 9, 0), new Date(2026, 2, 23, 10, 0)),
  ])
  const updateRouteState = vi.fn(async () => {})

  const Harness = defineComponent({
    setup() {
      state = useSessionsPanelState({
        anchorDate: computed(() => anchorDate.value),
        currentMode: computed(() => currentMode.value),
        resolvedTimeBoxes: computed(() => resolvedTimeBoxes.value),
        updateRouteState,
        visibleCalendarTimeBoxes: computed(() => visibleCalendarTimeBoxes.value),
        visibleDayTimeBoxes: computed(() => visibleDayTimeBoxes.value),
      })

      return () => null
    },
  })

  return {
    anchorDate,
    currentMode,
    resolvedTimeBoxes,
    updateRouteState,
    visibleCalendarTimeBoxes,
    visibleDayTimeBoxes,
    wrapper: mount(Harness),
    getState: () => state!,
  }
}

describe('useSessionsPanelState', () => {
  beforeEach(() => {
    mediaMatches.value = true
  })

  it('restores the remembered persistent panel tab when escape dismisses a session panel', async () => {
    const flushScratchpad = vi.fn(async () => {})
    const { wrapper, getState } = mountHarness()
    const state = getState()

    await flushPendingWork()

    state.sessionsSidePanelRef.value = {
      flushScratchpad,
    }

    expect(state.panelMode.value).toBe('scratchpad')

    await state.openOverviewPanel()
    await flushPendingWork()

    expect(state.panelMode.value).toBe('overview')

    await state.openSessionPanel('session-1')
    await flushPendingWork()

    expect(state.panelMode.value).toBe('session')

    state.applyCalendarEscapeDismiss()
    await flushPendingWork()

    expect(flushScratchpad).toHaveBeenCalled()
    expect(state.panelMode.value).toBe('overview')

    wrapper.unmount()
  })

  it('keeps selection and panel mode consistent as day data and viewport mode change', async () => {
    const { currentMode, visibleDayTimeBoxes, wrapper, getState } = mountHarness()
    const state = getState()

    await flushPendingWork()

    state.selectSession('session-1')
    visibleDayTimeBoxes.value = []
    await flushPendingWork()

    expect(state.selectedSessionId.value).toBe('')

    mediaMatches.value = false
    await flushPendingWork()

    expect(state.panelMode.value).toBe('closed')

    currentMode.value = 'search'
    await flushPendingWork()

    expect(state.panelMode.value).toBe('closed')

    wrapper.unmount()
  })

  it('opens an overlay overview for populated week days and only syncs route for empty ones', async () => {
    const { currentMode, updateRouteState, visibleCalendarTimeBoxes, wrapper, getState } =
      mountHarness('week')
    const state = getState()

    await flushPendingWork()

    await state.handleOpenDay(nextDay)

    expect(state.panelMode.value).toBe('closed')
    expect(updateRouteState).toHaveBeenLastCalledWith({ date: nextDay }, { history: 'push' })

    updateRouteState.mockClear()
    visibleCalendarTimeBoxes.value = [
      buildTimeBox('session-2', new Date(2026, 2, 24, 13, 0), new Date(2026, 2, 24, 14, 0)),
    ]

    await state.handleOpenDay(nextDay)

    expect(currentMode.value).toBe('week')
    expect(state.panelMode.value).toBe('overview')
    expect(updateRouteState).toHaveBeenCalledWith({ date: nextDay }, { history: 'push' })

    wrapper.unmount()
  })
})
