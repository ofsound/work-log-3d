import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  applyActiveTimerDraft,
  createIdleActiveTimerState,
  deriveDesktopPublishedTimerState,
  getDesktopTimerNotification,
  getDesktopWindowState,
  getTimerSnapshot,
  pauseTimer,
  replaceActiveTimerState,
  resumeTimer,
  shouldPlayTimerAlert,
  shouldShowTimerNotification,
  startCountdownTimer,
  startCountupTimer,
} from '~/shared/worklog'

describe('desktop timer host behavior', () => {
  it('derives title-bar state from the shared timer snapshot', () => {
    const runningCountdown = startCountdownTimer(300, 0)
    const timerState = getDesktopWindowState({
      ...runningCountdown,
      display: '05:00',
      elapsedSeconds: 0,
      remainingSeconds: 300,
      completionGapSeconds: null,
      isActive: true,
    })

    expect(timerState).toEqual({
      timerDisplay: '05:00',
      isRunning: true,
      mode: 'countdown',
    })
  })

  it('plays alert audio only when a countdown crosses into completion', () => {
    expect(shouldPlayTimerAlert('running', { status: 'completed', mode: 'countdown' })).toBe(true)
    expect(shouldPlayTimerAlert('running', { status: 'completed', mode: 'countup' })).toBe(false)
    expect(shouldPlayTimerAlert('completed', { status: 'completed', mode: 'countdown' })).toBe(
      false,
    )
  })

  it('builds a desktop notification for completed countdown timers', () => {
    const completedCountdown = getTimerSnapshot(startCountdownTimer(10, 0), 10_000)

    expect(
      shouldShowTimerNotification('running', {
        ...completedCountdown,
        status: 'completed',
        endedAtMs: 10_000,
      }),
    ).toBe(true)

    expect(
      getDesktopTimerNotification({
        ...completedCountdown,
        status: 'completed',
        endedAtMs: 10_000,
      }),
    ).toEqual({
      title: 'Work Log Timer',
      body: 'Countdown complete. Open Work Log to review or save the session.',
    })
  })

  it('loads the generated Nuxt renderer instead of the deleted Electron Vue app', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'electron/main.ts'), 'utf8')

    expect(mainSource).toContain('../renderer/index.html')
    expect(existsSync(resolve(process.cwd(), 'electron/renderer/src/App.vue'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'src/renderer/main.ts'))).toBe(false)
  })

  it('derives live countup tray timing from published state without renderer ticks', () => {
    const published = replaceActiveTimerState(
      createIdleActiveTimerState(),
      startCountupTimer(1_000),
    )

    expect(deriveDesktopPublishedTimerState(published, 66_000)).toEqual({
      state: published,
      snapshot: getTimerSnapshot(published, 66_000),
    })
  })

  it('auto-completes countdown tray timing from published state at the correct wall clock time', () => {
    const published = applyActiveTimerDraft(
      replaceActiveTimerState(createIdleActiveTimerState(), startCountdownTimer(10, 2_000)),
      {
        project: 'project-1',
        tags: ['tag-1'],
        draftNotes: 'Focus block',
      },
    )

    const derived = deriveDesktopPublishedTimerState(published, 12_000)

    expect(derived.state.status).toBe('completed')
    expect(derived.state.project).toBe('project-1')
    expect(derived.state.tags).toEqual(['tag-1'])
    expect(derived.state.draftNotes).toBe('Focus block')
    expect(derived.snapshot.display).toBe('00:00')
  })

  it('keeps paused timers visually frozen until resumed', () => {
    const paused = replaceActiveTimerState(
      createIdleActiveTimerState(),
      pauseTimer(startCountupTimer(1_000), 66_000),
    )

    const derived = deriveDesktopPublishedTimerState(paused, 126_000)

    expect(derived.state).toEqual(paused)
    expect(derived.snapshot.display).toBe('01:05')
  })

  it('resumes live tray counting after a paused countup resumes', () => {
    const paused = replaceActiveTimerState(
      createIdleActiveTimerState(),
      pauseTimer(startCountupTimer(1_000), 66_000),
    )
    const resumed = replaceActiveTimerState(
      createIdleActiveTimerState(),
      resumeTimer(paused, 126_000),
    )

    const derived = deriveDesktopPublishedTimerState(resumed, 129_000)

    expect(derived.state.status).toBe('running')
    expect(derived.snapshot.display).toBe('01:08')
  })

  it('ignores stale published snapshot text and derives the current tray display from state', () => {
    const published = replaceActiveTimerState(
      createIdleActiveTimerState(),
      startCountupTimer(1_000),
    )

    expect(deriveDesktopPublishedTimerState(published, 121_000).snapshot.display).toBe('02:00')
  })
})
