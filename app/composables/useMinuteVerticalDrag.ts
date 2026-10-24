import { onBeforeUnmount, ref } from 'vue'

import { MINUTE_DRAG_THRESHOLD_PX, minuteDragDeltaMinutes } from '~/utils/minute-vertical-drag'

export type MinuteVerticalDragSessionEndArgs = {
  deltaMinutes: number
  didDragBeyondThreshold: boolean
}

export type UseMinuteVerticalDragOptions = {
  onSessionStart: () => void
  onDrag: (deltaMinutes: number) => void
  onSessionEnd: (args: MinuteVerticalDragSessionEndArgs) => void
  blurSelector?: string
}

export function useMinuteVerticalDrag(options: UseMinuteVerticalDragOptions) {
  const pointerSessionActive = ref(false)
  const dragActive = ref(false)
  const startClientY = ref(0)
  const lastClientY = ref(0)

  function removeWindowListeners() {
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerCancel)
    window.removeEventListener('blur', onWindowPointerCancel)
  }

  function endSession(event?: PointerEvent) {
    if (!pointerSessionActive.value) {
      return
    }

    const cancelled = event === undefined
    const y = event && Number.isFinite(event.clientY) ? event.clientY : lastClientY.value
    const deltaMinutes = cancelled ? 0 : minuteDragDeltaMinutes(startClientY.value, y)
    const didDragBeyondThreshold = !cancelled && dragActive.value

    removeWindowListeners()
    // Restore previews and fields that update continuously, without committing the gesture.
    if (cancelled && dragActive.value) options.onDrag(0)
    pointerSessionActive.value = false
    dragActive.value = false

    options.onSessionEnd({ deltaMinutes, didDragBeyondThreshold })
  }

  function onWindowPointerMove(event: PointerEvent) {
    if (!pointerSessionActive.value) {
      return
    }

    const dy = Math.abs(event.clientY - startClientY.value)

    if (!dragActive.value) {
      if (dy < MINUTE_DRAG_THRESHOLD_PX) {
        return
      }

      dragActive.value = true

      if (options.blurSelector) {
        const el = document.querySelector(options.blurSelector)

        if (el instanceof HTMLElement) {
          el.blur()
        }
      }
    }

    lastClientY.value = event.clientY
    event.preventDefault()
    options.onDrag(minuteDragDeltaMinutes(startClientY.value, event.clientY))
  }

  function onWindowPointerUp(event: PointerEvent) {
    endSession(event)
  }

  function onWindowPointerCancel() {
    endSession()
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || pointerSessionActive.value) {
      return
    }

    pointerSessionActive.value = true
    dragActive.value = false
    startClientY.value = event.clientY
    lastClientY.value = event.clientY
    options.onSessionStart()

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerCancel)
    window.addEventListener('blur', onWindowPointerCancel)
  }

  onBeforeUnmount(() => {
    removeWindowListeners()
    pointerSessionActive.value = false
    dragActive.value = false
  })

  return {
    pointerSessionActive,
    dragActive,
    onPointerDown,
  }
}
