// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive } from 'vue'

import type { SessionsTimedGridProps } from '~/app/composables/useSessionsTimedGridInteraction'
import { useSessionsTimedGridInteraction } from '~/app/composables/useSessionsTimedGridInteraction'
import type { Project, TimeBox } from '~~/shared/worklog'

const HOUR_HEIGHT = 72
const TIME_GUTTER_WIDTH = 56

const activeDate = new Date(2026, 2, 23)
const nextDay = new Date(2026, 2, 24)

const projectById: Record<string, Project> = {
  'project-1': {
    id: 'project-1',
    name: 'Client Portal',
    slug: 'client-portal',
    notes: '',
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
  },
}

const buildTimeBox = (): TimeBox => ({
  id: 'session-1',
  notes: 'Deep work',
  project: 'project-1',
  tags: [],
  startTime: new Date(2026, 2, 23, 9, 0),
  endTime: new Date(2026, 2, 23, 10, 0),
})

const setRect = (
  element: HTMLElement,
  {
    top = 0,
    left = 0,
    width = 0,
    height = 0,
  }: {
    top?: number
    left?: number
    width?: number
    height?: number
  },
) => {
  element.getBoundingClientRect = () =>
    ({
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

const dispatchPointer = (type: 'pointermove' | 'pointerup', init: MouseEventInit) => {
  window.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  )
}

const flushGridWork = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const mountHarness = (overrides: Partial<SessionsTimedGridProps> = {}) => {
  let state: ReturnType<typeof useSessionsTimedGridInteraction> | null = null

  const props = reactive<SessionsTimedGridProps>({
    activeDate,
    createPreviewRange: null,
    days: [activeDate],
    headerClickEnabled: true,
    projectById,
    projectNameById: {
      'project-1': 'Client Portal',
    },
    scrollAlignTarget: null,
    selectedSessionId: '',
    timeBoxes: [buildTimeBox()],
    ...overrides,
  })
  const onChangeSession = vi.fn()
  const onCreateSession = vi.fn()
  const onDismissCalendar = vi.fn()
  const onOpenDay = vi.fn()
  const onOpenScratchpad = vi.fn()
  const onOpenSession = vi.fn()

  const Harness = defineComponent({
    setup() {
      state = useSessionsTimedGridInteraction({
        hourHeight: HOUR_HEIGHT,
        interactionThreshold: 4,
        minimumDurationMinutes: 10,
        onChangeSession,
        onCreateSession,
        onDismissCalendar,
        onOpenDay,
        onOpenScratchpad,
        onOpenSession,
        props,
        snapMinutes: 10,
        timeGutterWidth: TIME_GUTTER_WIDTH,
      })

      return () => null
    },
  })

  return {
    onChangeSession,
    onCreateSession,
    onDismissCalendar,
    onOpenDay,
    onOpenScratchpad,
    onOpenSession,
    props,
    wrapper: mount(Harness),
    getState: () => state!,
  }
}

describe('useSessionsTimedGridInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('treats day-view create clicks as scratchpad opens and session clicks as session opens', async () => {
    const harness = mountHarness()
    const state = harness.getState()
    const surface = document.createElement('div')

    setRect(surface, {
      top: 0,
      left: 0,
      width: 320,
      height: HOUR_HEIGHT * 24,
    })
    state.setCalendarSurfaceRef(surface, 0)

    state.handleCreatePointerDown(
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 120,
        clientY: HOUR_HEIGHT * 8,
      }) as unknown as PointerEvent,
    )
    dispatchPointer('pointerup', {
      button: 0,
      clientX: 120,
      clientY: HOUR_HEIGHT * 8,
    })

    expect(harness.onOpenScratchpad).toHaveBeenCalledTimes(1)
    expect(harness.onCreateSession).not.toHaveBeenCalled()

    const layout = state.dayLayouts.value[0]![0]!

    state.handleSessionPointerDown(
      layout,
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 120,
        clientY: HOUR_HEIGHT * 9,
      }) as unknown as PointerEvent,
    )
    dispatchPointer('pointerup', {
      button: 0,
      clientX: 120,
      clientY: HOUR_HEIGHT * 9,
    })

    expect(harness.onOpenSession).toHaveBeenCalledWith('session-1')
    expect(harness.onChangeSession).not.toHaveBeenCalled()

    harness.wrapper.unmount()
  })

  it('emits resize mutations after pointer drags cross the interaction threshold', async () => {
    const harness = mountHarness()
    const state = harness.getState()
    const surface = document.createElement('div')

    setRect(surface, {
      top: 0,
      left: 0,
      width: 320,
      height: HOUR_HEIGHT * 24,
    })
    state.setCalendarSurfaceRef(surface, 0)

    state.handleResizePointerDown(
      buildTimeBox(),
      'end',
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 120,
        clientY: HOUR_HEIGHT * 10,
      }) as unknown as PointerEvent,
    )
    dispatchPointer('pointermove', {
      button: 0,
      clientX: 120,
      clientY: HOUR_HEIGHT * 11,
    })
    dispatchPointer('pointerup', {
      button: 0,
      clientX: 120,
      clientY: HOUR_HEIGHT * 11,
    })

    expect(harness.onChangeSession).toHaveBeenCalledTimes(1)

    const payload = harness.onChangeSession.mock.calls[0]![0]

    expect(payload.id).toBe('session-1')
    expect(payload.duplicate).toBe(false)
    expect(payload.input.startTime).toEqual(new Date(2026, 2, 23, 9, 0))
    expect(payload.input.endTime).toEqual(new Date(2026, 2, 23, 11, 0))

    harness.wrapper.unmount()
  })

  it('creates week-view sessions across columns and suppresses the next backing click', async () => {
    const harness = mountHarness({
      days: [activeDate, nextDay],
    })
    const state = harness.getState()
    const surface = document.createElement('div')
    const grid = document.createElement('div')

    setRect(surface, {
      top: 0,
      left: 0,
      width: 560,
      height: HOUR_HEIGHT * 24,
    })
    setRect(grid, {
      top: 0,
      left: 0,
      width: 560,
      height: HOUR_HEIGHT * 24,
    })
    state.setCalendarSurfaceRef(surface, 0)
    state.weekCalendarGridRef.value = grid

    state.handleCreatePointerDown(
      new MouseEvent('pointerdown', {
        button: 0,
        clientX: 80,
        clientY: HOUR_HEIGHT * 8,
      }) as unknown as PointerEvent,
    )
    dispatchPointer('pointermove', {
      button: 0,
      clientX: 320,
      clientY: HOUR_HEIGHT * 9,
    })
    dispatchPointer('pointerup', {
      button: 0,
      clientX: 320,
      clientY: HOUR_HEIGHT * 9,
    })

    expect(harness.onCreateSession).toHaveBeenCalledTimes(1)

    const payload = harness.onCreateSession.mock.calls[0]![0]

    expect(payload.startTime).toEqual(new Date(2026, 2, 23, 8, 0))
    expect(payload.endTime).toEqual(new Date(2026, 2, 24, 9, 0))

    const currentTarget = document.createElement('div')
    const preventDefault = vi.fn()

    state.handleWeekColumnBackingClick(nextDay, {
      currentTarget,
      preventDefault,
      target: currentTarget,
    } as unknown as MouseEvent)

    expect(harness.onOpenDay).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()

    harness.wrapper.unmount()
  })

  it('realigns the scroll container to the 7:30 marker when visible days change', async () => {
    const scrollAlignTarget = document.createElement('div')
    const harness = mountHarness({
      scrollAlignTarget,
    })
    const state = harness.getState()
    const scrollContainer = document.createElement('div')
    const marker = document.createElement('div')

    setRect(scrollAlignTarget, {
      top: 80,
      left: 0,
      width: 40,
      height: 20,
    })
    setRect(scrollContainer, {
      top: 0,
      left: 0,
      width: 320,
      height: 400,
    })
    setRect(marker, {
      top: 320,
      left: 0,
      width: 320,
      height: 0,
    })

    scrollContainer.scrollTop = 20
    state.scrollContainerRef.value = scrollContainer
    state.setSevenThirtyLineRef(marker, 0)

    await flushGridWork()

    scrollContainer.scrollTop = 20
    harness.props.days = [nextDay]
    await flushGridWork()

    expect(scrollContainer.scrollTop).toBe(240)

    harness.wrapper.unmount()
  })
})
