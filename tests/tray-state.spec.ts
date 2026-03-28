import {
  createDesktopTrayShortcutActionId,
  createIdleTimerState,
  formatDesktopTrayBadgeText,
  getDesktopTrayStructuralKey,
  getDesktopTrayState,
  getTimerSnapshot,
  pauseTimer,
  shouldHideWindowOnClose,
  startCountdownTimer,
  startCountupTimer,
  type UserSettingsTrayShortcut,
} from '~/shared/worklog'

describe('desktop tray state', () => {
  const customShortcuts: UserSettingsTrayShortcut[] = [
    {
      id: 'deep-work',
      label: 'Deep Work',
      timerMode: 'countdown',
      durationMinutes: 45,
      project: 'project-1',
      tags: ['tag-1'],
    },
    {
      id: 'admin',
      label: 'Admin Catch-up',
      timerMode: 'countup',
      durationMinutes: null,
      project: 'project-2',
      tags: ['tag-2'],
    },
  ]

  it('derives the idle tray menu with timer start actions', () => {
    const trayState = getDesktopTrayState(getTimerSnapshot(createIdleTimerState(), 0), 'darwin')

    expect(trayState.mode).toBe('idle')
    expect(trayState.title).toBe('')
    expect(trayState.visualMode).toBe('icon')
    expect(trayState.badgeText).toBeNull()
    expect(trayState.badgeVariant).toBeNull()
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Timer idle', enabled: false },
      { kind: 'separator' },
      {
        kind: 'action',
        id: 'start_default_countdown',
        label: 'Start Countdown (30m)',
        enabled: true,
      },
      { kind: 'action', id: 'start_countup', label: 'Start Timer', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('adds configured tray shortcuts to idle menus after the built-in timer actions', () => {
    const trayState = getDesktopTrayState(
      getTimerSnapshot(createIdleTimerState(), 0),
      'darwin',
      customShortcuts,
    )

    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Timer idle', enabled: false },
      { kind: 'separator' },
      {
        kind: 'action',
        id: 'start_default_countdown',
        label: 'Start Countdown (30m)',
        enabled: true,
      },
      { kind: 'action', id: 'start_countup', label: 'Start Timer', enabled: true },
      {
        kind: 'action',
        id: createDesktopTrayShortcutActionId('deep-work'),
        label: 'Deep Work',
        enabled: true,
      },
      {
        kind: 'action',
        id: createDesktopTrayShortcutActionId('admin'),
        label: 'Admin Catch-up',
        enabled: true,
      },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('uses timer status for running menus and shortcut config for idle menus', () => {
    const runningA = getTimerSnapshot(startCountupTimer(0), 65_000)
    const runningB = getTimerSnapshot(startCountupTimer(0), 125_000)
    const runningCountdown = getTimerSnapshot(startCountdownTimer(300, 60_000), 120_000)
    const idleSnapshot = getTimerSnapshot(createIdleTimerState(), 0)

    expect(getDesktopTrayStructuralKey(runningA)).toBe('running:countup')
    expect(getDesktopTrayStructuralKey(runningB)).toBe('running:countup')
    expect(getDesktopTrayStructuralKey(runningCountdown)).toBe('running:countdown')
    expect(getDesktopTrayStructuralKey(idleSnapshot)).toBe('idle:30')
    expect(getDesktopTrayStructuralKey(idleSnapshot, customShortcuts)).not.toBe('idle:30')
    expect(
      getDesktopTrayStructuralKey(idleSnapshot, [
        {
          ...customShortcuts[0],
          label: 'Renamed shortcut',
        },
      ]),
    ).not.toBe(getDesktopTrayStructuralKey(idleSnapshot, [customShortcuts[0]]))
    expect(getDesktopTrayStructuralKey(idleSnapshot, [], 45)).toBe('idle:45')
  })

  it('uses live text in the macOS tray while a timer is active', () => {
    const runningCountup = getTimerSnapshot(startCountupTimer(0), 65_000)
    const trayState = getDesktopTrayState(runningCountup, 'darwin')

    expect(trayState.mode).toBe('running')
    expect(trayState.title).toBe(' 01:05')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 01:05')
    expect(trayState.badgeVariant).toBe('running')
    expect(trayState.statusLabel).toBe('Running • Count Up')
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Running • Count Up', enabled: false },
      { kind: 'separator' },
      { kind: 'action', id: 'pause', label: 'Pause', enabled: true },
      { kind: 'action', id: 'stop_and_log', label: 'Stop and Log', enabled: true },
      { kind: 'action', id: 'reset', label: 'Reset', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
  })

  it('includes add-time actions for active countdown tray menus', () => {
    const runningCountdown = getTimerSnapshot(startCountdownTimer(300, 0), 60_000)
    const pausedCountdown = getTimerSnapshot(pauseTimer(startCountdownTimer(300, 0), 60_000), 0)

    expect(getDesktopTrayState(runningCountdown, 'darwin').menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_5_minutes',
      label: '+5 min',
      enabled: true,
    })
    expect(getDesktopTrayState(runningCountdown, 'darwin').menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_10_minutes',
      label: '+10 min',
      enabled: true,
    })
    expect(getDesktopTrayState(pausedCountdown, 'darwin').menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_5_minutes',
      label: '+5 min',
      enabled: true,
    })
    expect(getDesktopTrayState(pausedCountdown, 'darwin').menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_10_minutes',
      label: '+10 min',
      enabled: true,
    })
  })

  it('falls back to tooltip-only timing on non-mac platforms', () => {
    const runningCountdown = getTimerSnapshot(startCountdownTimer(300, 0), 60_000)
    const trayState = getDesktopTrayState(runningCountdown, 'win32')

    expect(trayState.title).toBe('')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBeNull()
    expect(trayState.badgeVariant).toBe('running')
    expect(trayState.tooltip).toBe('Work Log: Running • Count Down')
    expect(trayState.menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_5_minutes',
      label: '+5 min',
      enabled: true,
    })
    expect(trayState.menuItems).toContainEqual({
      kind: 'action',
      id: 'add_countdown_10_minutes',
      label: '+10 min',
      enabled: true,
    })
  })

  it('exposes stopped countup tray actions for resume, log, and reset', () => {
    const pausedCountup = getTimerSnapshot(pauseTimer(startCountupTimer(0), 65_000), 125_000)
    const trayState = getDesktopTrayState(pausedCountup, 'darwin')

    expect(trayState.mode).toBe('paused')
    expect(trayState.title).toBe(' 01:05')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 01:05')
    expect(trayState.badgeVariant).toBe('paused')
    expect(trayState.statusLabel).toBe('Stopped • Count Up')
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Stopped • Count Up', enabled: false },
      { kind: 'separator' },
      { kind: 'action', id: 'resume', label: 'Resume', enabled: true },
      { kind: 'action', id: 'open_window_to_log_session', label: 'Log', enabled: true },
      { kind: 'action', id: 'reset', label: 'Reset', enabled: true },
      { kind: 'separator' },
      { kind: 'action', id: 'show_window', label: 'Show Window', enabled: true },
      { kind: 'action', id: 'quit', label: 'Quit', enabled: true },
    ])
    expect(trayState.menuItems).not.toContainEqual({
      kind: 'action',
      id: 'add_countdown_5_minutes',
      label: '+5 min',
      enabled: true,
    })
    expect(trayState.menuItems).not.toContainEqual({
      kind: 'action',
      id: 'add_countdown_10_minutes',
      label: '+10 min',
      enabled: true,
    })
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
    expect(trayState.title).toBe(' 00:00')
    expect(trayState.visualMode).toBe('badge')
    expect(trayState.badgeText).toBe(' 00:00')
    expect(trayState.badgeVariant).toBe('completed')
    expect(trayState.menuItems).toEqual([
      { kind: 'status', label: 'Completed • Count Down', enabled: false },
      { kind: 'separator' },
      { kind: 'action', id: 'add_countdown_5_minutes', label: '+5 min', enabled: true },
      { kind: 'action', id: 'add_countdown_10_minutes', label: '+10 min', enabled: true },
      {
        kind: 'action',
        id: 'start_default_countdown',
        label: 'Start Countdown (30m)',
        enabled: true,
      },
      { kind: 'action', id: 'start_countup', label: 'Start Timer', enabled: true },
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

  it('uses the synced countdown default minutes in tray labels', () => {
    const trayState = getDesktopTrayState(
      getTimerSnapshot(createIdleTimerState(), 0),
      'darwin',
      [],
      45,
    )

    expect(trayState.menuItems).toContainEqual({
      kind: 'action',
      id: 'start_default_countdown',
      label: 'Start Countdown (45m)',
      enabled: true,
    })
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
