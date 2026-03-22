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
  | 'pause'
  | 'resume'
  | 'stop'
  | 'reset'
  | 'show_window'
  | 'open_window_to_log_session'
  | 'quit'

export type DesktopTrayVisualMode = 'icon' | 'badge'
export type DesktopTrayBadgeVariant = 'running' | 'paused' | 'completed'

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
  visualMode: DesktopTrayVisualMode
  badgeText: string | null
  badgeVariant: DesktopTrayBadgeVariant | null
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

export type DesktopAlertSoundSource = 'bundled' | 'custom'

export interface DesktopAlertSoundState {
  source: DesktopAlertSoundSource
  fileName: string
  customFileName: string | null
}

export const DEFAULT_DESKTOP_CAPABILITIES: DesktopCapabilities = {
  isDesktop: false,
  nativeTimer: false,
  routeRequests: false,
}

export interface DesktopApi {
  getCapabilities(): DesktopCapabilities
  getTimerState(): Promise<TimerState>
  getAlertSound(): Promise<DesktopAlertSoundState>
  subscribeToTimer(listener: (event: DesktopTimerEvent) => void): () => void
  subscribeToRouteRequest(listener: (path: string) => void): () => void
  startCountup(): Promise<void>
  startCountdown(durationSeconds: number): Promise<void>
  pauseTimer(): Promise<void>
  resumeTimer(): Promise<void>
  stopTimer(): Promise<void>
  cancelTimer(): Promise<void>
  chooseAlertSound(): Promise<DesktopAlertSoundState>
  clearAlertSound(): Promise<DesktopAlertSoundState>
  testAlertSound(): Promise<void>
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

const getDesktopTrayTitle = (snapshot: TimerSnapshot, platform: NodeJS.Platform): string => {
  if (platform !== 'darwin') {
    return ''
  }

  const icon = snapshot.status === 'completed' ? '✓' : ''

  if (snapshot.status === 'idle') {
    return icon
  }

  return `${icon} ${snapshot.display}`
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

export const formatDesktopTrayBadgeText = (display: string) => {
  const [minutes, seconds] = display.split(':')

  if (!minutes || !seconds) {
    return display.padStart(6, ' ')
  }

  return `${minutes.padStart(3, ' ')}:${seconds.padStart(2, '0')}`
}

export const getDesktopTrayState = (
  snapshot: TimerSnapshot,
  platform: NodeJS.Platform = process.platform,
): DesktopTrayState => {
  if (snapshot.status === 'idle') {
    const statusLabel = 'Timer idle'

    return {
      mode: 'idle',
      title: getDesktopTrayTitle(snapshot, platform),
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      visualMode: 'icon',
      badgeText: null,
      badgeVariant: null,
      menuItems: [
        createStatusItem(statusLabel),
        separatorItem,
        createActionItem('start_focus', 'Pomodoro (30m)'),
        createActionItem('start_countup', 'Start Timer'),
        separatorItem,
        createActionItem('show_window', 'Show Window'),
        createActionItem('quit', 'Quit'),
      ],
    }
  }

  const modeLabel = getTimerModeLabel(snapshot.mode)
  const badgeText = platform === 'darwin' ? formatDesktopTrayBadgeText(snapshot.display) : null

  if (snapshot.status === 'running') {
    const statusLabel = `Running • ${modeLabel}`

    return {
      mode: 'running',
      title: getDesktopTrayTitle(snapshot, platform),
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      visualMode: 'badge',
      badgeText,
      badgeVariant: 'running',
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
    const statusLabel = `Paused • ${modeLabel}`

    return {
      mode: 'paused',
      title: getDesktopTrayTitle(snapshot, platform),
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      visualMode: 'badge',
      badgeText,
      badgeVariant: 'paused',
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

  const statusLabel = `Completed • ${modeLabel}`

  return {
    mode: 'completed',
    title: getDesktopTrayTitle(snapshot, platform),
    tooltip: `Work Log: ${statusLabel}`,
    statusLabel,
    visualMode: 'badge',
    badgeText,
    badgeVariant: 'completed',
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
