import type { TimerState } from '~~/shared/worklog'
import {
  addCountdownSeconds,
  cancelTimer,
  createIdleTimerState,
  getTimerSnapshot,
  pauseTimer,
  resumeTimer,
  startCountdownTimer,
  startCountupTimer,
  stopTimer,
  syncTimerState,
} from '~~/shared/worklog'

let timerInterval: number | null = null
let desktopTimerSubscription: (() => void) | null = null
let desktopTimerSyncPromise: Promise<void> | null = null

export function useTimerService() {
  const { desktopApi, hasNativeTimer } = useHostRuntime()
  const timerState = useState<TimerState>('active-timer-state', createIdleTimerState)
  const timerNow = useState('active-timer-now', () => Date.now())
  const isReady = useState('active-timer-ready', () => !hasNativeTimer)

  const clearLocalInterval = () => {
    if (timerInterval === null || typeof window === 'undefined') {
      return
    }

    window.clearInterval(timerInterval)
    timerInterval = null
  }

  const ensureInterval = () => {
    if (typeof window === 'undefined' || timerInterval) {
      return
    }

    timerInterval = window.setInterval(() => {
      timerNow.value = Date.now()
      timerState.value = syncTimerState(timerState.value, timerNow.value)
    }, 250)
  }

  const ensureDesktopSync = async () => {
    if (!desktopApi || desktopTimerSyncPromise) {
      return desktopTimerSyncPromise
    }

    desktopTimerSyncPromise = (async () => {
      clearLocalInterval()
      timerNow.value = Date.now()
      timerState.value = await desktopApi.getTimerState()
      isReady.value = true

      desktopTimerSubscription?.()
      desktopTimerSubscription = desktopApi.subscribeToTimer((event) => {
        timerNow.value = Date.now()
        timerState.value = event.state
      })
    })()

    await desktopTimerSyncPromise
  }

  if (hasNativeTimer) {
    void ensureDesktopSync()
  } else {
    isReady.value = true
    ensureInterval()
  }

  const startCountup = async () => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.startCountup()
      return
    }

    timerNow.value = Date.now()
    timerState.value = startCountupTimer(timerNow.value)
  }

  const startCountdown = async (durationMinutes: number) => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.startCountdown(durationMinutes * 60)
      return
    }

    timerNow.value = Date.now()
    timerState.value = startCountdownTimer(durationMinutes * 60, timerNow.value)
  }

  const pause = async () => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.pauseTimer()
      return
    }

    timerNow.value = Date.now()
    timerState.value = pauseTimer(timerState.value, timerNow.value)
  }

  const resume = async () => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.resumeTimer()
      return
    }

    timerNow.value = Date.now()
    timerState.value = resumeTimer(timerState.value, timerNow.value)
  }

  const addCountdownMinutes = async (minutes: number) => {
    const durationSeconds = minutes * 60

    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.addCountdownTime(durationSeconds)
      return
    }

    timerNow.value = Date.now()
    timerState.value = addCountdownSeconds(timerState.value, durationSeconds, timerNow.value)
  }

  const stop = async () => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.stopTimer()
      return
    }

    timerNow.value = Date.now()
    timerState.value = stopTimer(timerState.value, timerNow.value)
  }

  const cancel = async () => {
    if (desktopApi) {
      await ensureDesktopSync()
      await desktopApi.cancelTimer()
      return
    }

    timerState.value = cancelTimer()
    timerNow.value = Date.now()
  }

  const snapshot = computed(() => getTimerSnapshot(timerState.value, timerNow.value))

  return {
    isReady,
    timerState,
    snapshot,
    startCountup,
    startCountdown,
    addCountdownMinutes,
    pause,
    resume,
    stop,
    cancel,
  }
}
