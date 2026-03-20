import type { TimerSnapshot, TimerState } from './timer'

export interface DesktopTimerEvent {
  state: TimerState
  snapshot: TimerSnapshot
  previousStatus: TimerState['status']
}

export interface DesktopWindowState {
  timerDisplay: string
  isRunning: boolean
  mode: TimerSnapshot['mode']
}

export type DesktopTrayActionId =
  | 'start_countup'
  | 'start_focus'
  | 'start_break'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'reset'
  | 'show_window'
  | 'open_window_to_log_session'
  | 'quit'

export type DesktopTrayMenuItem =
  | {
    kind: 'status'
    label: string
    enabled: false
  }
  | {
    kind: 'separator'
  }
  | {
    kind: 'action'
    id: DesktopTrayActionId
    label: string
    enabled: boolean
  }

export interface DesktopTrayState {
  mode: TimerState['status']
  title: string
  tooltip: string
  statusLabel: string
  menuItems: DesktopTrayMenuItem[]
}

export interface DesktopTimerNotification {
  title: string
  body: string
}

export interface DesktopCapabilities {
  isDesktop: boolean
  nativeTimer: boolean
  routeRequests: boolean
}

export const DEFAULT_DESKTOP_CAPABILITIES: DesktopCapabilities = {
  isDesktop: false,
  nativeTimer: false,
  routeRequests: false,
}

export interface DesktopApi {
  getCapabilities(): DesktopCapabilities
  getTimerState(): Promise<TimerState>
  subscribeToTimer(listener: (event: DesktopTimerEvent) => void): () => void
  subscribeToRouteRequest(listener: (path: string) => void): () => void
  startCountup(): Promise<void>
  startCountdown(durationSeconds: number): Promise<void>
  pauseTimer(): Promise<void>
  resumeTimer(): Promise<void>
  stopTimer(): Promise<void>
  cancelTimer(): Promise<void>
}

declare global {
  interface Window {
    worklogDesktop?: DesktopApi
  }
}

export const getDesktopWindowState = (snapshot: TimerSnapshot): DesktopWindowState => ({
  timerDisplay: snapshot.display,
  isRunning: snapshot.status === 'running' || snapshot.status === 'paused',
  mode: snapshot.mode,
})

const getTimerModeLabel = (mode: TimerSnapshot['mode']) => {
  if (mode === 'countdown') {
    return 'Count Down'
  }

  if (mode === 'countup') {
    return 'Count Up'
  }

  return 'Timer'
}

const createStatusItem = (label: string): DesktopTrayMenuItem => ({
  kind: 'status',
  label,
  enabled: false,
})

const createActionItem = (
  id: DesktopTrayActionId,
  label: string,
  enabled = true,
): DesktopTrayMenuItem => ({
  kind: 'action',
  id,
  label,
  enabled,
})

const separatorItem: DesktopTrayMenuItem = { kind: 'separator' }

/**
 * Identifies tray **menu structure** (which actions exist). When this is unchanged, only
 * time-derived labels/tooltip/title need updating — not a full `Menu.buildFromTemplate`.
 * Extend this if menu items ever depend on fields beyond `snapshot.status`.
 */
export const getDesktopTrayStructuralKey = (snapshot: TimerSnapshot): TimerState['status'] =>
  snapshot.status

export const getDesktopTrayState = (
  snapshot: TimerSnapshot,
  platform: NodeJS.Platform = process.platform,
): DesktopTrayState => {
  if (snapshot.status === 'idle') {
    const statusLabel = 'Timer idle'

    return {
      mode: 'idle',
      title: '',
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      menuItems: [
        createStatusItem(statusLabel),
        separatorItem,
        createActionItem('start_countup', 'Start Count Up'),
        createActionItem('start_focus', 'Start Focus (25m)'),
        createActionItem('start_break', 'Start Break (5m)'),
        separatorItem,
        createActionItem('show_window', 'Show Window'),
        createActionItem('quit', 'Quit'),
      ],
    }
  }

  const modeLabel = getTimerModeLabel(snapshot.mode)
  const title =
    platform === 'darwin' && (snapshot.status === 'running' || snapshot.status === 'paused')
      ? snapshot.display
      : ''

  if (snapshot.status === 'running') {
    const statusLabel = `Running • ${modeLabel} • ${snapshot.display}`

    return {
      mode: 'running',
      title,
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      menuItems: [
        createStatusItem(statusLabel),
        separatorItem,
        createActionItem('pause', 'Pause'),
        createActionItem('stop', 'Stop'),
        createActionItem('reset', 'Reset'),
        separatorItem,
        createActionItem('show_window', 'Show Window'),
        createActionItem('quit', 'Quit'),
      ],
    }
  }

  if (snapshot.status === 'paused') {
    const statusLabel = `Paused • ${modeLabel} • ${snapshot.display}`

    return {
      mode: 'paused',
      title,
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      menuItems: [
        createStatusItem(statusLabel),
        separatorItem,
        createActionItem('resume', 'Resume'),
        createActionItem('stop', 'Stop'),
        createActionItem('reset', 'Reset'),
        separatorItem,
        createActionItem('show_window', 'Show Window'),
        createActionItem('quit', 'Quit'),
      ],
    }
  }

  const statusLabel = `Completed • ${modeLabel} • ${snapshot.display}`

  return {
    mode: 'completed',
    title: '',
    tooltip: `Work Log: ${statusLabel}`,
    statusLabel,
    menuItems: [
      createStatusItem(statusLabel),
      separatorItem,
      createActionItem('open_window_to_log_session', 'Open Window to Log Session'),
      createActionItem('reset', 'Reset'),
      separatorItem,
      createActionItem('show_window', 'Show Window'),
      createActionItem('quit', 'Quit'),
    ],
  }
}

export const shouldPlayTimerAlert = (
  previousStatus: TimerState['status'],
  nextStatus: TimerState['status'],
) => previousStatus !== 'completed' && nextStatus === 'completed'

export const shouldHideWindowOnClose = (isQuitting: boolean) => !isQuitting

export const shouldShowTimerNotification = (
  previousStatus: TimerState['status'],
  snapshot: TimerSnapshot,
) =>
  previousStatus !== 'completed' && snapshot.status === 'completed' && snapshot.mode === 'countdown'

export const getDesktopTimerNotification = (snapshot: TimerSnapshot): DesktopTimerNotification => ({
  title: 'Work Log Timer',
  body:
    snapshot.mode === 'countdown'
      ? 'Countdown complete. Open Work Log to review or save the session.'
      : 'Timer complete.',
})
