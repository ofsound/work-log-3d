import type { ActiveTimerState } from './active-timer'
import type { UserSettingsTrayShortcut } from './settings'
import type { TimerSnapshot, TimerState } from './timer'

export interface DesktopPublishedTimerState {
  state: ActiveTimerState
  snapshot: TimerSnapshot
}

export type DesktopTimerAction =
  | {
      type: 'start_countup'
      project: string
      tags: string[]
    }
  | {
      type: 'start_countdown'
      durationSeconds: number
      project: string
      tags: string[]
    }
  | {
      type: 'add_countdown_time'
      durationSeconds: number
    }
  | {
      type: 'pause'
    }
  | {
      type: 'resume'
    }
  | {
      type: 'stop'
    }
  | {
      type: 'cancel'
    }

export interface DesktopWindowState {
  timerDisplay: string
  isRunning: boolean
  mode: TimerSnapshot['mode']
}

export type DesktopTrayActionId =
  | 'start_countup'
  | 'add_countdown_5_minutes'
  | 'add_countdown_10_minutes'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'stop_and_log'
  | 'reset'
  | 'show_window'
  | 'open_window_to_log_session'
  | `shortcut:${string}`
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
  getAlertSound(): Promise<DesktopAlertSoundState>
  setTrayShortcuts(shortcuts: UserSettingsTrayShortcut[]): Promise<void>
  setTimerBridgeReady(isReady: boolean): Promise<void>
  publishTimerState(state: ActiveTimerState, snapshot: TimerSnapshot): Promise<void>
  subscribeToRouteRequest(listener: (path: string) => void): () => void
  subscribeToTimerAction(listener: (action: DesktopTimerAction) => void): () => void
  chooseAlertSound(): Promise<DesktopAlertSoundState>
  clearAlertSound(): Promise<DesktopAlertSoundState>
  testAlertSound(): Promise<void>
  setCountdownDefaultMinutes(minutes: number): Promise<void>
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

  if (snapshot.status === 'idle') {
    return ''
  }

  return ` ${snapshot.display}`
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

export const createDesktopTrayShortcutActionId = (shortcutId: string): `shortcut:${string}` =>
  `shortcut:${shortcutId}`

export const isDesktopTrayShortcutActionId = (
  actionId: DesktopTrayActionId,
): actionId is `shortcut:${string}` => actionId.startsWith('shortcut:')

export const getDesktopTrayShortcutIdFromAction = (actionId: DesktopTrayActionId) =>
  isDesktopTrayShortcutActionId(actionId) ? actionId.slice('shortcut:'.length) : null

const createCountdownAdjustmentItems = (): DesktopTrayMenuItem[] => [
  createActionItem('add_countdown_5_minutes', '+5 min'),
  createActionItem('add_countdown_10_minutes', '+10 min'),
]

const createTrayShortcutItems = (
  shortcuts: readonly UserSettingsTrayShortcut[],
): DesktopTrayMenuItem[] =>
  shortcuts.map((shortcut) =>
    createActionItem(createDesktopTrayShortcutActionId(shortcut.id), shortcut.label),
  )

const getTrayShortcutStructuralKey = (shortcuts: readonly UserSettingsTrayShortcut[]) =>
  shortcuts
    .map((shortcut) =>
      JSON.stringify([
        shortcut.id,
        shortcut.label,
        shortcut.timerMode,
        shortcut.durationMinutes,
        shortcut.project,
        shortcut.tags,
      ]),
    )
    .join('|')

/**
 * Identifies tray **menu structure** (which actions exist). When this is unchanged, only
 * time-derived labels/tooltip/title need updating — not a full `Menu.buildFromTemplate`.
 * Running and paused menus also depend on timer mode because countdowns expose add-time actions.
 */
export const getDesktopTrayStructuralKey = (
  snapshot: TimerSnapshot,
  shortcuts: readonly UserSettingsTrayShortcut[] = [],
): string => {
  if (snapshot.status === 'running' || snapshot.status === 'paused') {
    return `${snapshot.status}:${snapshot.mode ?? 'timer'}`
  }

  const shortcutKey = getTrayShortcutStructuralKey(shortcuts)

  if (!shortcutKey) {
    return snapshot.status
  }

  return `${snapshot.status}:${shortcutKey}`
}

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
  shortcuts: readonly UserSettingsTrayShortcut[] = [],
): DesktopTrayState => {
  const trayShortcutItems = createTrayShortcutItems(shortcuts)

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
        createActionItem('start_countup', 'Start Timer'),
        ...trayShortcutItems,
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
    const countdownActions = snapshot.mode === 'countdown' ? createCountdownAdjustmentItems() : []
    const timerActions =
      snapshot.mode === 'countup'
        ? [createActionItem('pause', 'Pause'), createActionItem('stop_and_log', 'Stop and Log')]
        : [createActionItem('pause', 'Pause'), createActionItem('stop', 'Stop')]

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
        ...countdownActions,
        ...timerActions,
        createActionItem('reset', 'Reset'),
        separatorItem,
        createActionItem('show_window', 'Show Window'),
        createActionItem('quit', 'Quit'),
      ],
    }
  }

  if (snapshot.status === 'paused') {
    const statusLabel =
      snapshot.mode === 'countup' ? `Stopped • ${modeLabel}` : `Paused • ${modeLabel}`
    const countdownActions = snapshot.mode === 'countdown' ? createCountdownAdjustmentItems() : []
    const menuItems =
      snapshot.mode === 'countup'
        ? [
            createStatusItem(statusLabel),
            separatorItem,
            createActionItem('resume', 'Resume'),
            createActionItem('open_window_to_log_session', 'Log'),
            createActionItem('reset', 'Reset'),
            separatorItem,
            createActionItem('show_window', 'Show Window'),
            createActionItem('quit', 'Quit'),
          ]
        : [
            createStatusItem(statusLabel),
            separatorItem,
            createActionItem('resume', 'Resume'),
            ...countdownActions,
            createActionItem('stop', 'Stop'),
            createActionItem('reset', 'Reset'),
            separatorItem,
            createActionItem('show_window', 'Show Window'),
            createActionItem('quit', 'Quit'),
          ]

    return {
      mode: 'paused',
      title: getDesktopTrayTitle(snapshot, platform),
      tooltip: `Work Log: ${statusLabel}`,
      statusLabel,
      visualMode: 'badge',
      badgeText,
      badgeVariant: 'paused',
      menuItems,
    }
  }

  const statusLabel = `Completed • ${modeLabel}`
  const countdownActions = snapshot.mode === 'countdown' ? createCountdownAdjustmentItems() : []

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
      ...countdownActions,
      createActionItem('start_countup', 'Start Timer'),
      ...trayShortcutItems,
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
  nextState: Pick<TimerState, 'status' | 'mode'>,
) =>
  previousStatus !== 'completed' &&
  nextState.status === 'completed' &&
  nextState.mode === 'countdown'

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
