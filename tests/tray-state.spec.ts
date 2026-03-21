import {
  createIdleTimerState,
  formatDesktopTrayBadgeText,
  getDesktopTrayStructuralKey,
  getDesktopTrayState,
  getTimerSnapshot,
  pauseTimer,
  shouldHideWindowOnClose,
  startCountdownTimer,
  startCountupTimer,
} from '~/shared/worklog'

describe('desktop tray state', () => {
  it('derives the idle tray menu with timer start actions', () => {
    const trayState = getDesktopTrayState(getTimerSnapshot(createIdleTimerState(), 0), 'darwin')

    expect(trayState.mode).toBe('idle')
    expect(trayState.title).toBe('◔')
    expect(trayState.visualMode).toBe('icon')
    expect(trayState.badgeText).toBeNull()
    expect(trayState.badgeVariant).toBeNull()
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Timer idle', enabled: false },
      { kind: 'separator' },
      { kind: 'action', id: 'start_countup', label: 'Start Count Up', enabled: true },
      { kind: 'action', id: 'start_focus', label: 'Start Focus (25m)', enabled: true },
      { kind: 'action', id: 'start_break', label: 'Start Break (5m)', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('uses structural key from timer status only so menu shape can skip rebuilds while time ticks', () => {
    const runningA = getTimerSnapshot(startCountupTimer(0), 65_000)
    const runningB = getTimerSnapshot(startCountupTimer(0), 125_000)

    expect(getDesktopTrayStructuralKey(runningA)).toBe('running')
    expect(getDesktopTrayStructuralKey(runningB)).toBe('running')
    expect(getDesktopTrayStructuralKey(getTimerSnapshot(createIdleTimerState(), 0))).toBe('idle')
  })

  it('uses live text in the macOS tray while a timer is active', () => {
    const runningCountup = getTimerSnapshot(startCountupTimer(0), 65_000)
    const trayState = getDesktopTrayState(runningCountup, 'darwin')

    expect(trayState.mode).toBe('running')
    expect(trayState.title).toBe('◔ 01:05')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 01:05')
    expect(trayState.badgeVariant).toBe('running')
    expect(trayState.statusLabel).toBe('Running • Count Up • 01:05')
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Running • Count Up • 01:05', enabled: false },
      { kind: 'separator' },
      { kind: 'action', id: 'pause', label: 'Pause', enabled: true },
      { kind: 'action', id: 'stop', label: 'Stop', enabled: true },
      { kind: 'action', id: 'reset', label: 'Reset', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('falls back to tooltip-only timing on non-mac platforms', () => {
    const runningCountdown = getTimerSnapshot(startCountdownTimer(300, 0), 60_000)
    const trayState = getDesktopTrayState(runningCountdown, 'win32')

    expect(trayState.title).toBe('')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBeNull()
    expect(trayState.badgeVariant).toBe('running')
    expect(trayState.tooltip).toBe('Work Log: Running • Count Down • 04:00')
  })

  it('exposes paused badge metadata without changing the tray menu structure', () => {
    const pausedCountup = getTimerSnapshot(pauseTimer(startCountupTimer(0), 65_000), 125_000)
    const trayState = getDesktopTrayState(pausedCountup, 'darwin')

    expect(trayState.mode).toBe('paused')
    expect(trayState.title).toBe('◔ 01:05')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 01:05')
    expect(trayState.badgeVariant).toBe('paused')
    expect(trayState.statusLabel).toBe('Paused • Count Up • 01:05')
  })

  it('exposes the completed tray actions for logging a finished session', () => {
    const completedCountdown = getTimerSnapshot(startCountdownTimer(10, 0), 10_000)
    const trayState = getDesktopTrayState(
      {
        ...completedCountdown,
        status: 'completed',
        endedAtMs: 10_000,
      },
      'darwin',
    )

    expect(trayState.mode).toBe('completed')
    expect(trayState.title).toBe('✓ 00:00')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 00:00')
    expect(trayState.badgeVariant).toBe('completed')
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Completed • Count Down • 00:00', enabled: false },
      { kind: 'separator' },
      {
        kind: 'action',
        id: 'open_window_to_log_session',
        label: 'Open Window to Log Session',
        enabled: true,
      },
      { kind: 'action', id: 'reset', label: 'Reset', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('hides the window on close unless the app is explicitly quitting', () => {
    expect(shouldHideWindowOnClose(false)).toBe(true)
    expect(shouldHideWindowOnClose(true)).toBe(false)
  })

  it('formats tray badge text into a fixed MMM:SS slot', () => {
    expect(formatDesktopTrayBadgeText('01:11')).toBe(' 01:11')
    expect(formatDesktopTrayBadgeText('08:08')).toBe(' 08:08')
    expect(formatDesktopTrayBadgeText('59:59')).toBe(' 59:59')
    expect(formatDesktopTrayBadgeText('100:00')).toBe('100:00')
  })
})
