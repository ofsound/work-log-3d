import { useHostRuntime } from '~/composables/useHostRuntime'
import { useTimerService } from '~/composables/useTimerService'

export default defineNuxtPlugin(() => {
  const { desktopApi, isDesktop } = useHostRuntime()
  const timerService = useTimerService()

  if (!isDesktop || !desktopApi) {
    return
  }

  watch(
    () => timerService.isPersistentReady.value,
    (isReady) => {
      void desktopApi.setTimerBridgeReady(isReady).catch((error) => {
        console.warn('[worklog] unable to publish timer bridge readiness to desktop shell', error)
      })
    },
    { immediate: true },
  )

  desktopApi.subscribeToTimerAction((action) => {
    switch (action.type) {
      case 'start_countup':
        void timerService.startCountup({
          project: action.project,
          tags: action.tags,
        })
        break
      case 'start_countdown':
        void timerService.startCountdownSeconds(action.durationSeconds, {
          project: action.project,
          tags: action.tags,
        })
        break
      case 'add_countdown_time':
        void timerService.addCountdownMinutes(action.durationSeconds / 60)
        break
      case 'pause':
        void timerService.pause()
        break
      case 'resume':
        void timerService.resume()
        break
      case 'stop':
        void timerService.stop()
        break
      case 'cancel':
        void timerService.cancel()
        break
    }
  })

  let lastPublishedKey = ''

  watch(
    () => {
      const snapshot = timerService.snapshot.value
      const state = timerService.timerState.value

      return JSON.stringify([
        snapshot.display,
        snapshot.status,
        snapshot.mode,
        state.startedAtMs,
        state.durationSeconds,
        state.originalDurationSeconds,
        state.pausedAtMs,
        state.accumulatedPauseMs,
        state.endedAtMs,
        state.lastExtensionConsumedSeconds,
        state.project,
        state.tags,
        state.draftNotes,
        state.updatedAtMs,
        state.updatedByDeviceId,
        state.mutationId,
      ])
    },
    () => {
      if (!timerService.isPersistentReady.value) {
        return
      }

      const nextKey = JSON.stringify([
        timerService.snapshot.value.display,
        timerService.snapshot.value.status,
        timerService.snapshot.value.mode,
        timerService.timerState.value.project,
        timerService.timerState.value.tags,
        timerService.timerState.value.draftNotes,
        timerService.timerState.value.updatedAtMs,
        timerService.timerState.value.updatedByDeviceId,
        timerService.timerState.value.mutationId,
      ])

      if (nextKey === lastPublishedKey) {
        return
      }

      lastPublishedKey = nextKey

      void desktopApi
        .publishTimerState(timerService.timerState.value, timerService.snapshot.value)
        .catch((error) => {
          console.warn('[worklog] unable to publish timer state to desktop shell', error)
        })
    },
    { immediate: true },
  )
})
