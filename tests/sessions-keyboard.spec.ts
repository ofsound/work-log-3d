// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, defineComponent, ref } from 'vue'

import type { SessionsViewMode } from '~/app/utils/sessions-route-state'

const { useSessionsKeyboard } = await import('~/app/composables/useSessionsKeyboard')

const dispatchKeyboard = (
  key: string,
  init: KeyboardEventInit = {},
  target: Window | HTMLElement = window,
) => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  })

  target.dispatchEvent(event)
  return event
}

const mountHarness = (initialMode: SessionsViewMode = 'day') => {
  const currentMode = ref<SessionsViewMode>(initialMode)
  const selectedSessionId = ref('session-1')
  const applyCalendarEscapeDismiss = vi.fn()
  const goToday = vi.fn(async () => {})
  const moveDaySelection = vi.fn()
  const openSelectedSession = vi.fn(async () => {})
  const openSuggestedCreatePanel = vi.fn(async () => {})
  const shiftDate = vi.fn(async () => {})

  const Harness = defineComponent({
    setup() {
      useSessionsKeyboard({
        anchorDate: computed(() => new Date(2026, 2, 23)),
        applyCalendarEscapeDismiss,
        currentMode: computed(() => currentMode.value),
        goToday,
        moveDaySelection,
        openSelectedSession,
        openSuggestedCreatePanel,
        selectedSessionId,
        shiftDate,
      })

      return () => null
    },
  })

  return {
    applyCalendarEscapeDismiss,
    currentMode,
    goToday,
    moveDaySelection,
    openSelectedSession,
    openSuggestedCreatePanel,
    selectedSessionId,
    shiftDate,
    wrapper: mount(Harness),
  }
}

describe('useSessionsKeyboard', () => {
  it('routes day-mode shortcuts to the correct controller actions', () => {
    const harness = mountHarness()

    dispatchKeyboard('Escape')
    dispatchKeyboard('ArrowLeft')
    dispatchKeyboard('ArrowRight', { shiftKey: true })
    dispatchKeyboard('t')
    dispatchKeyboard('j')
    dispatchKeyboard('k')
    dispatchKeyboard('Enter')
    dispatchKeyboard('n')

    expect(harness.applyCalendarEscapeDismiss).toHaveBeenCalledTimes(1)
    expect(harness.shiftDate).toHaveBeenNthCalledWith(1, -1)
    expect(harness.shiftDate).toHaveBeenNthCalledWith(2, 7)
    expect(harness.goToday).toHaveBeenCalledTimes(1)
    expect(harness.moveDaySelection).toHaveBeenNthCalledWith(1, 1)
    expect(harness.moveDaySelection).toHaveBeenNthCalledWith(2, -1)
    expect(harness.openSelectedSession).toHaveBeenCalledWith('session-1')
    expect(harness.openSuggestedCreatePanel).toHaveBeenCalledTimes(1)

    harness.wrapper.unmount()
  })

  it('ignores shortcuts in search mode, editable targets, and modifier chords', () => {
    const harness = mountHarness('search')
    const input = document.createElement('input')

    document.body.appendChild(input)

    dispatchKeyboard('n')

    harness.currentMode.value = 'day'
    dispatchKeyboard('n', {}, input)
    dispatchKeyboard('t', { ctrlKey: true })
    dispatchKeyboard('Escape', { metaKey: true })

    expect(harness.openSuggestedCreatePanel).not.toHaveBeenCalled()
    expect(harness.goToday).not.toHaveBeenCalled()
    expect(harness.applyCalendarEscapeDismiss).not.toHaveBeenCalled()

    input.remove()
    harness.wrapper.unmount()
  })
})
