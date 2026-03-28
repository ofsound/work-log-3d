import { useHostRuntime } from '~/composables/useHostRuntime'
import { useTimerService } from '~/composables/useTimerService'

import {
  serializeActiveTimerState,
  serializeTimerSnapshot,
  type DesktopTimerAction,
} from '~~/shared/worklog'

export default defineNuxtPlugin(() => {
  const { desktopApi, isDesktop } = useHostRuntime()
  const timerService = useTimerService()
  let drainingQueuedActions = false
  let drainRequestedWhileBusy = false
  let queuedActionPollInterval: number | null = null

  if (!isDesktop || !desktopApi) {
    return
  }

  const applyTimerAction = async (action: DesktopTimerAction) => {
    switch (action.type) {
      case 'start_countup':
        await timerService.startCountup({
          project: action.project,
          tags: action.tags,
        })
        break
      case 'start_countdown':
        await timerService.startCountdownSeconds(action.durationSeconds, {
          project: action.project,
          tags: action.tags,
        })
        break
      case 'add_countdown_time':
        await timerService.addCountdownMinutes(action.durationSeconds / 60)
        break
      case 'pause':
        await timerService.pause()
        break
      case 'resume':
        await timerService.resume()
        break
      case 'stop':
        await timerService.stop()
        break
      case 'cancel':
        await timerService.cancel()
        break
    }
  }

  const consumeQueuedAction = async (id: number, action: DesktopTimerAction) => {
    await applyTimerAction(action)

    try {
      await desktopApi.ackTimerAction(id)
    } catch (error) {
      console.warn('[worklog] unable to acknowledge timer action to desktop shell', error)
    }
  }

  const drainQueuedActions = async () => {
    if (!timerService.isPersistentReady.value) {
      return
    }

    if (drainingQueuedActions) {
      drainRequestedWhileBusy = true
      return
    }

    drainingQueuedActions = true

    try {
      do {
        drainRequestedWhileBusy = false
        const queuedActions = await desktopApi.consumePendingTimerActions()

        for (const queuedAction of queuedActions) {
          await consumeQueuedAction(queuedAction.id, queuedAction.action)
        }
      } while (drainRequestedWhileBusy)
    } catch (error) {
      console.warn('[worklog] unable to consume timer actions from desktop shell', error)
    } finally {
      drainingQueuedActions = false
    }
  }

  watch(
    () => timerService.isPersistentReady.value,
    (isReady) => {
      void desktopApi.setTimerBridgeReady(isReady).catch((error) => {
        console.warn('[worklog] unable to publish timer bridge readiness to desktop shell', error)
      })

      if (!isReady) {
        return
      }

      void drainQueuedActions()
    },
    { immediate: true },
  )

  desktopApi.subscribeToTimerAction(() => {
    void drainQueuedActions()
  })

  if (typeof window !== 'undefined') {
    queuedActionPollInterval = window.setInterval(() => {
      if (!timerService.isPersistentReady.value) {
        return
      }

      void drainQueuedActions()
    }, 500)
  }

  let lastPublishedKey = ''

  watch(
    () => JSON.stringify(serializeActiveTimerState(timerService.timerState.value)),
    () => {
      if (!timerService.isPersistentReady.value) {
        return
      }

      const serializedSnapshot = serializeTimerSnapshot(timerService.snapshot.value)
      const serializedState = serializeActiveTimerState(timerService.timerState.value)
      const nextKey = JSON.stringify(serializedState)

      if (nextKey === lastPublishedKey) {
        return
      }

      lastPublishedKey = nextKey

      void desktopApi.publishTimerState(serializedState, serializedSnapshot).catch((error) => {
        console.warn('[worklog] unable to publish timer state to desktop shell', error)
      })
    },
    { immediate: true },
  )

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (queuedActionPollInterval !== null && typeof window !== 'undefined') {
        window.clearInterval(queuedActionPollInterval)
      }
    })
  }
})
