import {
  addCountdownSeconds,
  cancelTimer,
  createIdleTimerState,
  getTimerSnapshot,
  pauseTimer,
  resumeTimer,
  reviveTimerState,
  startCountdownTimer,
  startCountupTimer,
  stopTimer,
  syncTimerState,
} from '~/shared/worklog'

describe('timer state', () => {
  it('handles countup start, pause, resume, and stop', () => {
    const started = startCountupTimer(1_000)
    expect(getTimerSnapshot(started, 6_000).elapsedSeconds).toBe(5)

    const paused = pauseTimer(started, 6_000)
    expect(getTimerSnapshot(paused, 12_000).elapsedSeconds).toBe(5)

    const resumed = resumeTimer(paused, 12_000)
    expect(getTimerSnapshot(resumed, 15_000).elapsedSeconds).toBe(8)

    const stopped = stopTimer(resumed, 15_000)
    expect(stopped.status).toBe('completed')
    expect(getTimerSnapshot(stopped, 20_000).elapsedSeconds).toBe(8)
  })

  it('completes countdown timers automatically when synced', () => {
    const started = startCountdownTimer(10, 2_000)
    const synced = syncTimerState(started, 12_000)

    expect(synced.status).toBe('completed')
    expect(getTimerSnapshot(synced, 12_000).remainingSeconds).toBe(0)
    expect(getTimerSnapshot(synced, 12_000).display).toBe('00:00')
  })

  it('supports cancel and restore-after-restart', () => {
    const started = startCountdownTimer(60, 100)
    const restored = reviveTimerState(JSON.parse(JSON.stringify(started)))
    expect(restored).toEqual(started)

    expect(cancelTimer()).toEqual(createIdleTimerState())
  })

  it('adds time to a running countdown', () => {
    const started = startCountdownTimer(300, 0)
    const updated = addCountdownSeconds(started, 5 * 60)

    expect(getTimerSnapshot(updated, 60_000).remainingSeconds).toBe(540)
    expect(getTimerSnapshot(updated, 60_000).display).toBe('09:00')
  })

  it('adds time to a paused countdown without affecting elapsed time', () => {
    const started = startCountdownTimer(300, 0)
    const paused = pauseTimer(started, 60_000)
    const updated = addCountdownSeconds(paused, 10 * 60)
    const snapshot = getTimerSnapshot(updated, 120_000)

    expect(snapshot.elapsedSeconds).toBe(60)
    expect(snapshot.remainingSeconds).toBe(840)
    expect(snapshot.display).toBe('14:00')
  })

  it('ignores add-time requests for non-countdown timer states', () => {
    expect(addCountdownSeconds(createIdleTimerState(), 300)).toEqual(createIdleTimerState())

    const countup = startCountupTimer(0)
    expect(addCountdownSeconds(countup, 300)).toBe(countup)
  })
})
