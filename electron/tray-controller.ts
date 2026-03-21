import { Buffer } from 'node:buffer'

import { Menu, Tray, nativeImage } from 'electron'

import type { MenuItemConstructorOptions } from 'electron'
import {
  type DesktopTrayActionId,
  type DesktopTrayState,
  type TimerSnapshot,
  getDesktopTrayStructuralKey,
  getDesktopTrayState,
} from '~/shared/worklog'

export interface TrayController {
  popUpMenu(): void
  sync(snapshot: TimerSnapshot): void
  destroy(): void
}

interface CreateTrayControllerOptions {
  platform?: NodeJS.Platform
  onAction: (action: DesktopTrayActionId) => void
}

const createTrayIcon = (platform: NodeJS.Platform) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7" fill="black" />
      <path d="M9 4.5v4.7l3 1.8" fill="none" stroke="white" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `.trim()

  const icon = nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
    .resize({ width: 18, height: 18 })

  if (platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  return icon
}

const toMenuItem = (
  item: ReturnType<typeof getDesktopTrayState>['menuItems'][number],
  onAction: (action: DesktopTrayActionId) => void,
): MenuItemConstructorOptions => {
  if (item.kind === 'separator') {
    return { type: 'separator' }
  }

  if (item.kind === 'status') {
    return {
      label: item.label,
      enabled: false,
    }
  }

  return {
    label: item.label,
    enabled: item.enabled,
    click: () => onAction(item.id),
  }
}

const applyTrayCosmeticUpdates = (
  tray: Tray,
  menu: Menu,
  trayState: DesktopTrayState,
  platform: NodeJS.Platform,
) => {
  tray.setToolTip(trayState.tooltip)

  if (platform === 'darwin') {
    tray.setTitle(trayState.title, { fontType: 'monospacedDigit' })
  }

  const status = trayState.menuItems[0]
  if (status?.kind !== 'status' || menu.items.length === 0) {
    return
  }

  const first = menu.items[0]
  if ('label' in first && typeof first.label === 'string') {
    first.label = status.label
  }
}

export const createTrayController = ({
  platform = process.platform,
  onAction,
}: CreateTrayControllerOptions): TrayController => {
  const tray = new Tray(createTrayIcon(platform))
  let currentMenu = Menu.buildFromTemplate([])
  let lastStructuralKey = ''
  let lastCosmeticKey = ''

  const popUpMenu = () => {
    tray.popUpContextMenu(currentMenu)
  }

  tray.setIgnoreDoubleClickEvents(true)
  tray.on('click', popUpMenu)
  tray.on('right-click', popUpMenu)

  return {
    popUpMenu,
    sync(snapshot) {
      const structuralKey = getDesktopTrayStructuralKey(snapshot)
      const cosmeticKey = `${snapshot.status}:${snapshot.mode ?? 'timer'}:${snapshot.display}`

      if (
        lastStructuralKey !== '' &&
        structuralKey === lastStructuralKey &&
        cosmeticKey === lastCosmeticKey
      ) {
        return
      }

      const trayState = getDesktopTrayState(snapshot, platform)

      if (lastStructuralKey !== '' && structuralKey === lastStructuralKey) {
        applyTrayCosmeticUpdates(tray, currentMenu, trayState, platform)
        lastCosmeticKey = cosmeticKey
        return
      }

      lastStructuralKey = structuralKey
      lastCosmeticKey = cosmeticKey
      currentMenu = Menu.buildFromTemplate(
        trayState.menuItems.map((item) => toMenuItem(item, onAction)),
      )

      tray.setContextMenu(currentMenu)
      applyTrayCosmeticUpdates(tray, currentMenu, trayState, platform)
    },
    destroy() {
      tray.destroy()
    },
  }
}
