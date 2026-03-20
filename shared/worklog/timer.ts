import { formatSecondsToMinutesSeconds } from './formatters'

export type TimerMode = 'countup' | 'countdown'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface TimerState {
  mode: TimerMode | null
  status: TimerStatus
  startedAtMs: number | null
  durationSeconds: number | null
  pausedAtMs: number | null
  accumulatedPauseMs: number
  endedAtMs: number | null
}

export interface TimerSnapshot extends TimerState {
  display: string
  elapsedSeconds: number
  remainingSeconds: number | null
  isActive: boolean
}

export const createIdleTimerState = (): TimerState => ({
  mode: null,
  status: 'idle',
  startedAtMs: null,
  durationSeconds: null,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
  endedAtMs: null,
})

const getEffectiveNowMs = (state: TimerState, nowMs: number) => {
  if (state.status === 'paused' && state.pausedAtMs !== null) {
    return state.pausedAtMs
  }

  if (state.status === 'completed' && state.endedAtMs !== null) {
    return state.endedAtMs
  }

  return nowMs
}

export const getElapsedSeconds = (state: TimerState, nowMs: number) => {
  if (state.startedAtMs === null) {
    return 0
  }

  const effectiveNowMs = getEffectiveNowMs(state, nowMs)

  return Math.max(
    0,
    Math.floor((effectiveNowMs - state.startedAtMs - state.accumulatedPauseMs) / 1000),
  )
}

export const getRemainingSeconds = (state: TimerState, nowMs: number) => {
  if (state.mode !== 'countdown' || state.durationSeconds === null) {
    return null
  }

  return Math.max(0, state.durationSeconds - getElapsedSeconds(state, nowMs))
}

export const getTimerDisplay = (state: TimerState, nowMs: number) => {
  if (state.mode === 'countdown') {
    return formatSecondsToMinutesSeconds(getRemainingSeconds(state, nowMs) ?? 0)
  }

  return formatSecondsToMinutesSeconds(getElapsedSeconds(state, nowMs))
}

export const getTimerSnapshot = (state: TimerState, nowMs: number): TimerSnapshot => ({
  ...state,
  display: getTimerDisplay(state, nowMs),
  elapsedSeconds: getElapsedSeconds(state, nowMs),
  remainingSeconds: getRemainingSeconds(state, nowMs),
  isActive: state.status === 'running' || state.status === 'paused',
})

export const startCountupTimer = (nowMs: number): TimerState => ({
  mode: 'countup',
  status: 'running',
  startedAtMs: nowMs,
  durationSeconds: null,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
  endedAtMs: null,
})

export const startCountdownTimer = (durationSeconds: number, nowMs: number): TimerState => ({
  mode: 'countdown',
  status: 'running',
  startedAtMs: nowMs,
  durationSeconds,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
  endedAtMs: null,
})

export const pauseTimer = (state: TimerState, nowMs: number): TimerState => {
  if (state.status !== 'running') {
    return state
  }

  return {
    ...state,
    status: 'paused',
    pausedAtMs: nowMs,
  }
}

export const resumeTimer = (state: TimerState, nowMs: number): TimerState => {
  if (state.status !== 'paused' || state.pausedAtMs === null) {
    return state
  }

  return {
    ...state,
    status: 'running',
    pausedAtMs: null,
    accumulatedPauseMs: state.accumulatedPauseMs + (nowMs - state.pausedAtMs),
  }
}

export const completeTimer = (state: TimerState, nowMs: number): TimerState => {
  if (state.startedAtMs === null) {
    return createIdleTimerState()
  }

  return {
    ...state,
    status: 'completed',
    pausedAtMs: null,
    endedAtMs: nowMs,
  }
}

export const stopTimer = (state: TimerState, nowMs: number) => {
  if (state.status === 'idle') {
    return state
  }

  return completeTimer(state, nowMs)
}

export const cancelTimer = () => createIdleTimerState()

export const syncTimerState = (state: TimerState, nowMs: number) => {
  if (state.mode !== 'countdown' || state.status !== 'running' || state.durationSeconds === null) {
    return state
  }

  if (getRemainingSeconds(state, nowMs) === 0) {
    return completeTimer(state, nowMs)
  }

  return state
}

export const serializeTimerState = (state: TimerState) => state

export const reviveTimerState = (value: unknown): TimerState => {
  if (!value || typeof value !== 'object') {
    return createIdleTimerState()
  }

  const candidate = value as Partial<TimerState>

  return {
    mode: candidate.mode === 'countup' || candidate.mode === 'countdown' ? candidate.mode : null,
    status:
      candidate.status === 'running' ||
      candidate.status === 'paused' ||
      candidate.status === 'completed'
        ? candidate.status
        : 'idle',
    startedAtMs: typeof candidate.startedAtMs === 'number' ? candidate.startedAtMs : null,
    durationSeconds:
      typeof candidate.durationSeconds === 'number' ? candidate.durationSeconds : null,
    pausedAtMs: typeof candidate.pausedAtMs === 'number' ? candidate.pausedAtMs : null,
    accumulatedPauseMs:
      typeof candidate.accumulatedPauseMs === 'number' ? candidate.accumulatedPauseMs : 0,
    endedAtMs: typeof candidate.endedAtMs === 'number' ? candidate.endedAtMs : null,
  }
}
