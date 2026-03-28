import { dirname, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { Notification, app, BrowserWindow, dialog, ipcMain, screen, session } from 'electron'
import type { Rectangle } from 'electron'

import type {
  ActiveTimerState,
  DesktopPublishedTimerState,
  DesktopTimerAction,
  TimerSnapshot,
  UserSettingsTrayShortcut,
} from '~/shared/worklog'
import {
  DEFAULT_COUNTDOWN_DEFAULT_MINUTES,
  createIdleActiveTimerState,
  getDesktopTimerNotification,
  getDesktopTrayShortcutIdFromAction,
  getTimerSnapshot,
  isDesktopTrayShortcutActionId,
  normalizeCountdownDefaultMinutes,
  resolveUserSettingsTrayShortcuts,
  shouldHideWindowOnClose,
  shouldPlayTimerAlert,
  shouldShowTimerNotification,
} from '~/shared/worklog'
import type { TrayController } from '~/electron/tray-controller'
import {
  clearDesktopAlertSound,
  getDesktopAlertSoundState,
  importDesktopAlertSound,
} from '~/electron/audio-config'
import { playTimerCompleteAlert } from '~/electron/play-timer-alert'
import { createDesktopRendererServer } from '~/electron/renderer-server'
import { createTrayController } from '~/electron/tray-controller'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let timerState: ActiveTimerState = createIdleActiveTimerState()
let timerSnapshot: TimerSnapshot = getTimerSnapshot(timerState, Date.now())
let mainWindow: BrowserWindow | null = null
let isQuitting = false
let trayController: TrayController | null = null
let desktopTrayShortcuts: UserSettingsTrayShortcut[] = []
let pendingRouteRequest: string | null = null
let pendingTimerActions: DesktopTimerAction[] = []
let rendererTimerActionsReady = false
let rendererTimerBridgeReady = false
let desktopRendererServer: Awaited<ReturnType<typeof createDesktopRendererServer>> | null = null
let countdownDefaultMinutes = DEFAULT_COUNTDOWN_DEFAULT_MINUTES
let restoredWindowState: PersistedWindowState | null = null

/** Retain until `close` so macOS notification delivery is reliable (avoid premature GC). */
const activeTimerNotifications: Notification[] = []

const getTrayShortcutsPath = () => join(app.getPath('userData'), 'tray-shortcuts.json')
const getCountdownDefaultPath = () =>
  join(app.getPath('userData'), 'countdown-default-minutes.json')
const getWindowStatePath = () => join(app.getPath('userData'), 'window-state.json')
const desktopRendererUrl = process.env.NUXT_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL

type PersistedWindowState = {
  bounds: Rectangle
  isMaximized: boolean
}

const isBoundsVisible = (bounds: Rectangle) => {
  const displayBounds = screen.getDisplayMatching(bounds).workArea
  const overlapWidth =
    Math.min(bounds.x + bounds.width, displayBounds.x + displayBounds.width) -
    Math.max(bounds.x, displayBounds.x)
  const overlapHeight =
    Math.min(bounds.y + bounds.height, displayBounds.y + displayBounds.height) -
    Math.max(bounds.y, displayBounds.y)

  return overlapWidth > 0 && overlapHeight > 0
}

const loadWindowState = async (): Promise<PersistedWindowState | null> => {
  try {
    const savedState = JSON.parse(await readFile(getWindowStatePath(), 'utf8')) as {
      bounds?: Rectangle
      isMaximized?: boolean
    }

    const bounds = savedState.bounds
    if (
      !bounds ||
      typeof bounds.x !== 'number' ||
      typeof bounds.y !== 'number' ||
      typeof bounds.width !== 'number' ||
      typeof bounds.height !== 'number' ||
      bounds.width < 600 ||
      bounds.height < 400 ||
      !isBoundsVisible(bounds)
    ) {
      return null
    }

    return {
      bounds,
      isMaximized: savedState.isMaximized === true,
    }
  } catch {
    return null
  }
}

const persistWindowState = async (window: BrowserWindow) => {
  if (window.isMinimized()) {
    return
  }

  const windowStatePath = getWindowStatePath()
  const payload: PersistedWindowState = {
    bounds: window.getBounds(),
    isMaximized: window.isMaximized(),
  }

  await mkdir(dirname(windowStatePath), { recursive: true })
  await writeFile(windowStatePath, JSON.stringify(payload))
}

const persistTrayShortcuts = async () => {
  const trayShortcutsPath = getTrayShortcutsPath()
  await mkdir(dirname(trayShortcutsPath), { recursive: true })
  await writeFile(trayShortcutsPath, JSON.stringify(desktopTrayShortcuts))
}

const loadTrayShortcuts = async () => {
  try {
    const savedShortcuts = JSON.parse(await readFile(getTrayShortcutsPath(), 'utf8')) as
      | UserSettingsTrayShortcut[]
      | null
    desktopTrayShortcuts = resolveUserSettingsTrayShortcuts(savedShortcuts)
  } catch {
    desktopTrayShortcuts = []
  }
}

const loadCountdownDefaultMinutes = async () => {
  try {
    const raw = JSON.parse(await readFile(getCountdownDefaultPath(), 'utf8')) as {
      minutes?: unknown
    }
    countdownDefaultMinutes = normalizeCountdownDefaultMinutes(raw.minutes)
  } catch {
    countdownDefaultMinutes = DEFAULT_COUNTDOWN_DEFAULT_MINUTES
  }
}

const persistCountdownDefaultMinutes = async () => {
  const countdownDefaultPath = getCountdownDefaultPath()
  await mkdir(dirname(countdownDefaultPath), { recursive: true })
  await writeFile(countdownDefaultPath, JSON.stringify({ minutes: countdownDefaultMinutes }))
}

const setCountdownDefaultMinutesState = async (nextMinutes: number) => {
  countdownDefaultMinutes = normalizeCountdownDefaultMinutes(nextMinutes)
  await persistCountdownDefaultMinutes()
}

const syncTrayController = (snapshot = timerSnapshot) => {
  trayController?.sync(snapshot, desktopTrayShortcuts)
}

const setTrayShortcuts = async (nextShortcuts: readonly UserSettingsTrayShortcut[]) => {
  desktopTrayShortcuts = resolveUserSettingsTrayShortcuts(nextShortcuts)
  await persistTrayShortcuts()
  syncTrayController()

  return desktopTrayShortcuts
}

const flushPendingRouteRequest = () => {
  if (!mainWindow || !pendingRouteRequest || mainWindow.webContents.isLoadingMainFrame()) {
    return
  }

  mainWindow.webContents.send('app:navigate', pendingRouteRequest)
  pendingRouteRequest = null
}

const flushPendingTimerActions = () => {
  if (
    !mainWindow ||
    mainWindow.webContents.isLoadingMainFrame() ||
    !rendererTimerActionsReady ||
    !rendererTimerBridgeReady ||
    pendingTimerActions.length === 0
  ) {
    return
  }

  for (const action of pendingTimerActions) {
    mainWindow.webContents.send('desktop:timerAction', action)
  }

  pendingTimerActions = []
}

const dispatchTimerAction = (action: DesktopTimerAction) => {
  if (
    !mainWindow ||
    mainWindow.webContents.isLoadingMainFrame() ||
    !rendererTimerActionsReady ||
    !rendererTimerBridgeReady
  ) {
    pendingTimerActions.push(action)
    focusOrCreateMainWindow()
    return
  }

  mainWindow.webContents.send('desktop:timerAction', action)
}

const showTimerCompletionNotification = (payload: { title: string; body: string }) => {
  if (!Notification.isSupported()) {
    console.warn('[worklog] desktop notifications are not supported on this platform')
    return
  }

  const notification = new Notification(payload)
  activeTimerNotifications.push(notification)
  notification.on('close', () => {
    const index = activeTimerNotifications.indexOf(notification)
    if (index !== -1) {
      activeTimerNotifications.splice(index, 1)
    }
  })
  notification.show()
}

const registerMediaPermissionHandler = () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(false)
      return
    }

    callback(true)
  })
}

const setPublishedTimerState = (nextState: ActiveTimerState, nextSnapshot: TimerSnapshot) => {
  const previousStatus = timerState.status
  timerState = nextState
  timerSnapshot = nextSnapshot

  if (shouldPlayTimerAlert(previousStatus, nextState)) {
    const alertWindow =
      process.platform === 'darwin' ? (mainWindow ?? null) : (mainWindow ?? createMainWindow())
    void playTimerCompleteAlert(app.getPath('userData'), alertWindow)
  }

  if (shouldShowTimerNotification(previousStatus, nextSnapshot)) {
    showTimerCompletionNotification(getDesktopTimerNotification(nextSnapshot))
  }

  syncTrayController(nextSnapshot)
}

const createMainWindow = () => {
  if (mainWindow) {
    return mainWindow
  }

  const defaultBounds = {
    width: 1025,
    height: 1025,
  }

  const window = new BrowserWindow({
    width: restoredWindowState?.bounds.width ?? defaultBounds.width,
    height: restoredWindowState?.bounds.height ?? defaultBounds.height,
    x: restoredWindowState?.bounds.x,
    y: restoredWindowState?.bounds.y,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#f8fafc',
    title: 'Work Log',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow = window

  window.on('close', (event) => {
    if (shouldHideWindowOnClose(isQuitting)) {
      event.preventDefault()
      hideMainWindow()
    }
  })

  window.on('closed', () => {
    mainWindow = null
    rendererTimerActionsReady = false
    rendererTimerBridgeReady = false
  })

  window.on('resize', () => {
    void persistWindowState(window)
  })

  window.on('move', () => {
    void persistWindowState(window)
  })

  window.on('maximize', () => {
    void persistWindowState(window)
  })

  window.on('unmaximize', () => {
    void persistWindowState(window)
  })

  if (restoredWindowState?.isMaximized) {
    window.maximize()
  }

  restoredWindowState = null

  window.webContents.on('did-start-loading', () => {
    rendererTimerActionsReady = false
    rendererTimerBridgeReady = false
  })

  window.webContents.on('did-finish-load', () => {
    flushPendingRouteRequest()
    flushPendingTimerActions()
  })

  const rendererUrl = desktopRendererUrl ?? desktopRendererServer?.url

  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

const showMainWindow = () => {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
  flushPendingRouteRequest()
  flushPendingTimerActions()
}

const hideMainWindow = () => {
  mainWindow?.hide()
}

const focusOrCreateMainWindow = () => {
  if (!mainWindow) {
    createMainWindow()
  }

  showMainWindow()
}

const quitFromTray = () => {
  isQuitting = true
  app.quit()
}

const openMainWindow = (path?: string) => {
  if (path) {
    pendingRouteRequest = path
  }

  focusOrCreateMainWindow()
}

const buildNewTimeBoxPath = (shortcut?: Pick<UserSettingsTrayShortcut, 'project' | 'tags'>) => {
  const params = new URLSearchParams()

  if (shortcut?.project) {
    params.set('project', shortcut.project)
  }

  if (shortcut?.tags.length) {
    params.set('tags', shortcut.tags.join(','))
  }

  const queryString = params.toString()

  return queryString ? `/new?${queryString}` : '/new'
}

const runTrayShortcut = (shortcut: UserSettingsTrayShortcut) => {
  if (shortcut.timerMode === 'countdown') {
    dispatchTimerAction({
      type: 'start_countdown',
      durationSeconds: (shortcut.durationMinutes ?? 0) * 60,
      project: shortcut.project,
      tags: shortcut.tags,
    })
  } else {
    dispatchTimerAction({
      type: 'start_countup',
      project: shortcut.project,
      tags: shortcut.tags,
    })
  }

  openMainWindow(buildNewTimeBoxPath(shortcut))
}

const registerIpc = () => {
  ipcMain.handle('desktop:getAlertSound', async () => {
    return getDesktopAlertSoundState(app.getPath('userData'))
  })
  ipcMain.handle(
    'desktop:setTrayShortcuts',
    async (_event, shortcuts: UserSettingsTrayShortcut[]) => {
      await setTrayShortcuts(shortcuts)
    },
  )
  ipcMain.handle('desktop:setCountdownDefaultMinutes', async (_event, minutes: number) => {
    await setCountdownDefaultMinutesState(minutes)
  })
  ipcMain.handle('desktop:setTimerBridgeReady', async (_event, isReady: boolean) => {
    rendererTimerBridgeReady = isReady
    if (!isReady) {
      return
    }

    flushPendingTimerActions()
  })
  ipcMain.handle(
    'desktop:publishTimerState',
    async (_event, payload: DesktopPublishedTimerState) => {
      setPublishedTimerState(payload.state, payload.snapshot)
    },
  )
  ipcMain.on('desktop:timerActionReady', () => {
    rendererTimerActionsReady = true
    flushPendingTimerActions()
  })
  ipcMain.handle('desktop:chooseAlertSound', async () => {
    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio',
          extensions: ['mp3', 'wav', 'aiff', 'aif'],
        },
      ],
    })

    if (selection.canceled || !selection.filePaths[0]) {
      return getDesktopAlertSoundState(app.getPath('userData'))
    }

    return importDesktopAlertSound(app.getPath('userData'), selection.filePaths[0])
  })
  ipcMain.handle('desktop:clearAlertSound', async () => {
    return clearDesktopAlertSound(app.getPath('userData'))
  })
  ipcMain.handle('desktop:testAlertSound', async () => {
    const alertWindow =
      process.platform === 'darwin' ? (mainWindow ?? null) : (mainWindow ?? createMainWindow())
    await playTimerCompleteAlert(app.getPath('userData'), alertWindow)
  })
}

app.whenReady().then(async () => {
  registerMediaPermissionHandler()
  await loadTrayShortcuts()
  await loadCountdownDefaultMinutes()
  restoredWindowState = await loadWindowState()

  if (!desktopRendererUrl) {
    desktopRendererServer = await createDesktopRendererServer(join(__dirname, '../renderer'), {
      portStatePath: join(app.getPath('userData'), 'electron-renderer-port.json'),
    })
  }

  trayController = createTrayController({
    onAction(action) {
      if (isDesktopTrayShortcutActionId(action)) {
        const shortcutId = getDesktopTrayShortcutIdFromAction(action)
        const shortcut = desktopTrayShortcuts.find((item) => item.id === shortcutId)

        if (shortcut) {
          runTrayShortcut(shortcut)
        }

        return
      }

      switch (action) {
        case 'start_countup':
          dispatchTimerAction({
            type: 'start_countup',
            project: '',
            tags: [],
          })
          openMainWindow(buildNewTimeBoxPath())
          break
        case 'pause':
          dispatchTimerAction({ type: 'pause' })
          break
        case 'add_countdown_5_minutes':
          dispatchTimerAction({ type: 'add_countdown_time', durationSeconds: 5 * 60 })
          break
        case 'add_countdown_10_minutes':
          dispatchTimerAction({ type: 'add_countdown_time', durationSeconds: 10 * 60 })
          break
        case 'resume':
          dispatchTimerAction({ type: 'resume' })
          break
        case 'stop':
          dispatchTimerAction({ type: 'stop' })
          break
        case 'stop_and_log':
          dispatchTimerAction({ type: 'pause' })
          openMainWindow(buildNewTimeBoxPath())
          break
        case 'reset':
          dispatchTimerAction({ type: 'cancel' })
          break
        case 'show_window':
          openMainWindow()
          break
        case 'open_window_to_log_session':
          openMainWindow(buildNewTimeBoxPath())
          break
        case 'quit':
          quitFromTray()
          break
      }
    },
  })
  registerIpc()
  createMainWindow()
  syncTrayController()

  app.on('activate', () => {
    focusOrCreateMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  trayController?.destroy()
  void desktopRendererServer?.close()
})
