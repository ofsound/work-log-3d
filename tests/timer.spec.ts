import {
  addCountdownSeconds,
  applyActiveTimerDraft,
  cancelTimer,
  createIdleActiveTimerState,
  createIdleTimerState,
  getTimerSnapshot,
  pauseTimer,
  replaceActiveTimerState,
  resumeTimer,
  reviveActiveTimerState,
  reviveTimerState,
  startCountdownTimer,
  startCountupTimer,
  stopTimer,
  syncActiveTimerState,
  syncTimerState,
} from '~/shared/worklog'

describe('timer state', () => {
  it('treats stopping a countup as a resumable freeze', () => {
    const started = startCountupTimer(1_000)
    expect(getTimerSnapshot(started, 6_000).elapsedSeconds).toBe(5)

    const stopped = stopTimer(started, 6_000)
    expect(stopped.status).toBe('paused')
    expect(stopped.pausedAtMs).toBe(6_000)
    expect(getTimerSnapshot(stopped, 12_000).elapsedSeconds).toBe(5)

    const resumed = resumeTimer(stopped, 12_000)
    expect(getTimerSnapshot(resumed, 15_000).elapsedSeconds).toBe(8)
  })

  it('handles countdown start, pause, resume: remaining excludes paused wall time', () => {
    const started = startCountdownTimer(300, 0)
    expect(getTimerSnapshot(started, 60_000).remainingSeconds).toBe(240)

    const paused = pauseTimer(started, 60_000)
    expect(getTimerSnapshot(paused, 120_000).remainingSeconds).toBe(240)

    const resumed = resumeTimer(paused, 120_000)
    expect(getTimerSnapshot(resumed, 150_000).remainingSeconds).toBe(210)
    expect(getTimerSnapshot(resumed, 150_000).display).toBe('03:30')
  })

  it('still completes countdown timers when stopped explicitly', () => {
    const started = startCountdownTimer(300, 0)
    const stopped = stopTimer(started, 60_000)

    expect(stopped.status).toBe('completed')
    expect(stopped.endedAtMs).toBe(60_000)
    expect(getTimerSnapshot(stopped, 120_000).remainingSeconds).toBe(240)
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
    const updated = addCountdownSeconds(started, 5 * 60, 60_000)

    expect(getTimerSnapshot(updated, 60_000).remainingSeconds).toBe(540)
    expect(getTimerSnapshot(updated, 60_000).display).toBe('09:00')
  })

  it('adds time to a paused countdown without affecting elapsed time', () => {
    const started = startCountdownTimer(300, 0)
    const paused = pauseTimer(started, 60_000)
    const updated = addCountdownSeconds(paused, 10 * 60, 120_000)
    const snapshot = getTimerSnapshot(updated, 120_000)

    expect(snapshot.elapsedSeconds).toBe(60)
    expect(snapshot.remainingSeconds).toBe(840)
    expect(snapshot.display).toBe('14:00')
  })

  it('revives a completed countdown with only the unused extension time remaining', () => {
    const completed = syncTimerState(startCountdownTimer(300, 0), 300_000)
    const updated = addCountdownSeconds(completed, 10 * 60, 660_000)
    const snapshot = getTimerSnapshot(updated, 660_000)

    expect(updated.status).toBe('running')
    expect(updated.durationSeconds).toBe(900)
    expect(updated.originalDurationSeconds).toBe(300)
    expect(updated.lastExtensionConsumedSeconds).toBe(360)
    expect(updated.endedAtMs).toBeNull()
    expect(snapshot.remainingSeconds).toBe(240)
    expect(snapshot.display).toBe('04:00')
    expect(snapshot.completionGapSeconds).toBeNull()
  })

  it('keeps a completed countdown at zero when the added increment was already fully consumed', () => {
    const completed = syncTimerState(startCountdownTimer(300, 0), 300_000)
    const updated = addCountdownSeconds(completed, 5 * 60, 660_000)
    const snapshot = getTimerSnapshot(updated, 660_000)

    expect(updated.status).toBe('completed')
    expect(updated.durationSeconds).toBe(600)
    expect(updated.originalDurationSeconds).toBe(300)
    expect(updated.endedAtMs).toBe(600_000)
    expect(updated.lastExtensionConsumedSeconds).toBe(300)
    expect(snapshot.elapsedSeconds).toBe(600)
    expect(snapshot.remainingSeconds).toBe(0)
    expect(snapshot.display).toBe('00:00')
    expect(snapshot.completionGapSeconds).toBe(60)
  })

  it('subtracts time from a running countdown without going below elapsed time', () => {
    const started = startCountdownTimer(600, 0)
    const updated = addCountdownSeconds(started, -5 * 60, 60_000)

    expect(getTimerSnapshot(updated, 60_000).remainingSeconds).toBe(240)
    expect(getTimerSnapshot(updated, 60_000).display).toBe('04:00')
  })

  it('clamps subtracting when remaining time is less than the requested amount', () => {
    const started = startCountdownTimer(120, 0)
    const updated = addCountdownSeconds(started, -5 * 60, 60_000)

    expect(getTimerSnapshot(updated, 60_000).remainingSeconds).toBe(0)
    expect(getTimerSnapshot(updated, 60_000).display).toBe('00:00')
  })

  it('ignores add-time requests for non-countdown timer states', () => {
    expect(addCountdownSeconds(createIdleTimerState(), 300, 0)).toEqual(createIdleTimerState())

    const countup = startCountupTimer(0)
    expect(addCountdownSeconds(countup, 300, 0)).toBe(countup)
  })

  it('applies synced draft context without disturbing timer state', () => {
    const running = replaceActiveTimerState(createIdleActiveTimerState(), startCountupTimer(1_000))
    const updated = applyActiveTimerDraft(running, {
      project: ' project-1 ',
      tags: ['tag-1', 'tag-1', ''],
      draftNotes: ' Draft note ',
    })

    expect(updated.project).toBe('project-1')
    expect(updated.tags).toEqual(['tag-1'])
    expect(updated.draftNotes).toBe('Draft note')
    expect(updated.status).toBe('running')
    expect(updated.startedAtMs).toBe(1_000)
  })

  it('keeps draft context when countdown completion is synced', () => {
    const running = applyActiveTimerDraft(
      replaceActiveTimerState(createIdleActiveTimerState(), startCountdownTimer(10, 2_000)),
      {
        project: 'project-1',
        tags: ['tag-1'],
        draftNotes: 'Deep work',
      },
    )

    const synced = syncActiveTimerState(running, 12_000)

    expect(synced.status).toBe('completed')
    expect(synced.project).toBe('project-1')
    expect(synced.tags).toEqual(['tag-1'])
    expect(synced.draftNotes).toBe('Deep work')
  })

  it('revives active timer state with sanitized draft metadata', () => {
    const revived = reviveActiveTimerState({
      mode: 'countup',
      status: 'paused',
      startedAtMs: 100,
      durationSeconds: null,
      originalDurationSeconds: null,
      pausedAtMs: 200,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 0,
      project: ' project-1 ',
      tags: ['tag-1', '', 'tag-1'],
      draftNotes: ' Draft note ',
      updatedAtMs: 500,
      updatedByDeviceId: 'device-1',
      mutationId: 3,
    })

    expect(revived.project).toBe('project-1')
    expect(revived.tags).toEqual(['tag-1'])
    expect(revived.draftNotes).toBe('Draft note')
    expect(revived.updatedByDeviceId).toBe('device-1')
    expect(revived.mutationId).toBe(3)
  })
})
