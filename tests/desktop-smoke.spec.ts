import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getDesktopTimerNotification,
  getDesktopWindowState,
  getTimerSnapshot,
  shouldPlayTimerAlert,
  shouldShowTimerNotification,
  startCountdownTimer,
} from '~/shared/worklog'

describe('desktop timer host behavior', () => {
  it('derives title-bar state from the shared timer snapshot', () => {
    const runningCountdown = startCountdownTimer(300, 0)
    const timerState = getDesktopWindowState({
      ...runningCountdown,
      display: '05:00',
      elapsedSeconds: 0,
      remainingSeconds: 300,
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
})
