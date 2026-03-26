import { dirname, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { Notification, app, BrowserWindow, dialog, ipcMain, screen, session } from 'electron'
import type { Rectangle } from 'electron'

import type { DesktopTimerEvent, TimerState, UserSettingsTrayShortcut } from '~/shared/worklog'
import {
  DEFAULT_COUNTDOWN_DEFAULT_MINUTES,
  addCountdownSeconds,
  cancelTimer,
  createIdleTimerState,
  getDesktopTrayShortcutIdFromAction,
  getDesktopTimerNotification,
  getTimerSnapshot,
  isDesktopTrayShortcutActionId,
  normalizeCountdownDefaultMinutes,
  pauseTimer,
  resumeTimer,
  resolveUserSettingsTrayShortcuts,
  reviveTimerState,
  serializeTimerState,
  shouldHideWindowOnClose,
  shouldPlayTimerAlert,
  shouldShowTimerNotification,
  startCountdownTimer,
  startCountupTimer,
  stopTimer,
  syncTimerState,
} from '~/shared/worklog'
import type { TrayController } from '~/electron/tray-controller'
import {
  clearDesktopAlertSound,
  getDesktopAlertSoundState,
  importDesktopAlertSound,
} from '~/electron/audio-config'
import { createDesktopRendererServer } from '~/electron/renderer-server'
import { createTrayController } from '~/electron/tray-controller'
import { playTimerCompleteAlert } from '~/electron/play-timer-alert'

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let timerState: TimerState = createIdleTimerState()
let timerInterval: NodeJS.Timeout | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
let trayController: TrayController | null = null
let desktopTrayShortcuts: UserSettingsTrayShortcut[] = []
let pendingRouteRequest: string | null = null
let desktopRendererServer: Awaited<ReturnType<typeof createDesktopRendererServer>> | null = null
let countdownDefaultMinutes = DEFAULT_COUNTDOWN_DEFAULT_MINUTES
let restoredWindowState: PersistedWindowState | null = null

/** Retain until `close` so macOS notification delivery is reliable (avoid premature GC). */
const activeTimerNotifications: Notification[] = []

const getTimerStatePath = () => join(app.getPath('userData'), 'timer-state.json')
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

const persistTimerState = async () => {
  const timerStatePath = getTimerStatePath()
  await mkdir(dirname(timerStatePath), { recursive: true })
  await writeFile(timerStatePath, JSON.stringify(serializeTimerState(timerState)))
}

const loadTimerState = async () => {
  try {
    const savedState = await readFile(getTimerStatePath(), 'utf8')
    timerState = reviveTimerState(JSON.parse(savedState))
  } catch {
    timerState = createIdleTimerState()
  }
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

const syncTrayController = () => {
  trayController?.sync(getTimerSnapshot(timerState, Date.now()), desktopTrayShortcuts)
}

const setTrayShortcuts = async (nextShortcuts: readonly UserSettingsTrayShortcut[]) => {
  desktopTrayShortcuts = resolveUserSettingsTrayShortcuts(nextShortcuts)
  await persistTrayShortcuts()
  syncTrayController()

  return desktopTrayShortcuts
}

const emitTimerEvent = (previousStatus: TimerState['status']) => {
  const snapshot = getTimerSnapshot(timerState, Date.now())
  const event: DesktopTimerEvent = {
    state: timerState,
    snapshot,
    previousStatus,
  }

  syncTrayController()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('timer:state', event)
  })
}

const flushPendingRouteRequest = () => {
  if (!mainWindow || !pendingRouteRequest || mainWindow.webContents.isLoadingMainFrame()) {
    return
  }

  mainWindow.webContents.send('app:navigate', pendingRouteRequest)
  pendingRouteRequest = null
}

const clearTimerLoop = () => {
  if (!timerInterval) {
    return
  }

  clearInterval(timerInterval)
  timerInterval = null
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

const ensureTimerLoop = () => {
  if (timerInterval || timerState.status !== 'running') {
    return
  }

  timerInterval = setInterval(() => {
    const nextState = syncTimerState(timerState, Date.now())

    if (nextState !== timerState) {
      setTimerState(nextState)
    } else {
      emitTimerEvent(timerState.status)
    }

    if (timerState.status !== 'running') {
      clearTimerLoop()
    }
  }, 250)
}

const setTimerState = (nextState: TimerState) => {
  const previousStatus = timerState.status
  timerState = nextState
  void persistTimerState()

  if (shouldPlayTimerAlert(previousStatus, nextState)) {
    const alertWindow =
      process.platform === 'darwin' ? (mainWindow ?? null) : (mainWindow ?? createMainWindow())
    void playTimerCompleteAlert(app.getPath('userData'), alertWindow)
  }

  if (shouldShowTimerNotification(previousStatus, getTimerSnapshot(nextState, Date.now()))) {
    showTimerCompletionNotification(
      getDesktopTimerNotification(getTimerSnapshot(nextState, Date.now())),
    )
  }

  emitTimerEvent(previousStatus)

  if (timerState.status === 'running') {
    ensureTimerLoop()
  } else {
    clearTimerLoop()
  }
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

  window.webContents.on('did-finish-load', () => {
    flushPendingRouteRequest()
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
    setTimerState(startCountdownTimer((shortcut.durationMinutes ?? 0) * 60, Date.now()))
  } else {
    setTimerState(startCountupTimer(Date.now()))
  }

  openMainWindow(buildNewTimeBoxPath(shortcut))
}

const registerIpc = () => {
  ipcMain.handle('timer:getState', () => timerState)
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
  ipcMain.handle('timer:startCountup', () => {
    setTimerState(startCountupTimer(Date.now()))
  })
  ipcMain.handle('timer:startCountdown', (_event, durationSeconds: number) => {
    setTimerState(startCountdownTimer(durationSeconds, Date.now()))
  })
  ipcMain.handle('timer:addCountdownTime', (_event, durationSeconds: number) => {
    setTimerState(addCountdownSeconds(timerState, durationSeconds, Date.now()))
  })
  ipcMain.handle('timer:pause', () => {
    setTimerState(pauseTimer(timerState, Date.now()))
  })
  ipcMain.handle('timer:resume', () => {
    setTimerState(resumeTimer(timerState, Date.now()))
  })
  ipcMain.handle('timer:stop', () => {
    setTimerState(stopTimer(timerState, Date.now()))
  })
  ipcMain.handle('timer:cancel', () => {
    setTimerState(cancelTimer())
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
  await loadTimerState()
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
          setTimerState(startCountupTimer(Date.now()))
          openMainWindow(buildNewTimeBoxPath())
          break
        case 'pause':
          setTimerState(pauseTimer(timerState, Date.now()))
          break
        case 'add_countdown_5_minutes':
          setTimerState(addCountdownSeconds(timerState, 5 * 60, Date.now()))
          break
        case 'add_countdown_10_minutes':
          setTimerState(addCountdownSeconds(timerState, 10 * 60, Date.now()))
          break
        case 'resume':
          setTimerState(resumeTimer(timerState, Date.now()))
          break
        case 'stop':
          setTimerState(stopTimer(timerState, Date.now()))
          break
        case 'stop_and_log':
          setTimerState(pauseTimer(timerState, Date.now()))
          openMainWindow(buildNewTimeBoxPath())
          break
        case 'reset':
          setTimerState(cancelTimer())
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
  ensureTimerLoop()

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
