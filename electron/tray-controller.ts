import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Menu, Tray, nativeImage } from 'electron'

import type { MenuItemConstructorOptions } from 'electron'
import {
  type DesktopTrayActionId,
  type DesktopTrayState,
  type TimerSnapshot,
  getDesktopTrayStructuralKey,
  getDesktopTrayState,
} from '~/shared/worklog'
import { newTimeboxIconSvg } from '~/shared/icons/newTimeboxIcon'

export interface TrayController {
  popUpMenu(): void
  sync(snapshot: TimerSnapshot): void
  destroy(): void
}

interface CreateTrayControllerOptions {
  platform?: NodeJS.Platform
  onAction: (action: DesktopTrayActionId) => void
}

const DARWIN_TRAY_ICON_FILENAME = 'tray-iconTemplate.png'

const resolveUnpackedAsarPath = (filePath: string) => {
  const asarSegment = `${sep}app.asar${sep}`
  const unpackedSegment = `${sep}app.asar.unpacked${sep}`

  return filePath.includes(asarSegment) ? filePath.replace(asarSegment, unpackedSegment) : filePath
}

const resolveBundledTrayIconPath = () => {
  const mainDir = dirname(fileURLToPath(import.meta.url))
  const bundled = join(mainDir, 'resources', DARWIN_TRAY_ICON_FILENAME)
  if (existsSync(bundled)) {
    return bundled
  }

  const unpacked = resolveUnpackedAsarPath(bundled)
  if (unpacked !== bundled && existsSync(unpacked)) {
    return unpacked
  }

  const dev = join(process.cwd(), 'electron/resources', DARWIN_TRAY_ICON_FILENAME)
  if (existsSync(dev)) {
    return dev
  }

  return null
}

const createSvgTrayIcon = () => {
  const svg = newTimeboxIconSvg({ stroke: '#000000' }).trim()

  return nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
    .resize({ width: 18, height: 18 })
}

const createTrayIcon = (platform: NodeJS.Platform) => {
  if (platform !== 'darwin') {
    return createSvgTrayIcon()
  }

  const trayIconPath = resolveBundledTrayIconPath()
  const icon = trayIconPath ? nativeImage.createFromPath(trayIconPath) : createSvgTrayIcon()
  if (icon.isEmpty()) {
    const fallback = createSvgTrayIcon()
    fallback.setTemplateImage(true)
    return fallback
  }

  icon.setTemplateImage(true)
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
