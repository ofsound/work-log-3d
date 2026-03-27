import type { ComputedRef, Ref } from 'vue'

import { onBeforeUnmount, onMounted } from 'vue'

import type { SessionsViewMode } from '~/utils/sessions-route-state'

export interface UseSessionsKeyboardOptions {
  anchorDate: ComputedRef<Date>
  currentMode: ComputedRef<SessionsViewMode>
  selectedSessionId: Ref<string>
  applyCalendarEscapeDismiss: () => void
  goToday: () => Promise<void>
  moveDaySelection: (direction: -1 | 1) => void
  openSelectedSession: (sessionId: string) => Promise<void>
  openSuggestedCreatePanel: () => Promise<void>
  shiftDate: (days: number) => Promise<void>
}

const isEditableTarget = (event: KeyboardEvent) => {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useSessionsKeyboard(options: UseSessionsKeyboardOptions) {
  const handleCalendarKeyboard = (event: KeyboardEvent) => {
    if (
      ['search', 'year'].includes(options.currentMode.value) ||
      isEditableTarget(event) ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      options.applyCalendarEscapeDismiss()
      return
    }

    if (options.currentMode.value !== 'day') {
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      void options.shiftDate(event.shiftKey ? -7 : -1)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      void options.shiftDate(event.shiftKey ? 7 : 1)
      return
    }

    if (event.key.toLowerCase() === 't') {
      event.preventDefault()
      void options.goToday()
      return
    }

    if (event.key.toLowerCase() === 'j') {
      event.preventDefault()
      options.moveDaySelection(1)
      return
    }

    if (event.key.toLowerCase() === 'k') {
      event.preventDefault()
      options.moveDaySelection(-1)
      return
    }

    if (event.key === 'Enter' && options.selectedSessionId.value) {
      event.preventDefault()
      void options.openSelectedSession(options.selectedSessionId.value)
      return
    }

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault()
      void options.openSuggestedCreatePanel()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleCalendarKeyboard)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleCalendarKeyboard)
  })
}
