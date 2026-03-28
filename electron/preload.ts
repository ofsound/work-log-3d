import { contextBridge, ipcRenderer } from 'electron'

import type { IpcRendererEvent } from 'electron'
import type {
  ActiveTimerState,
  DesktopApi,
  DesktopPublishedTimerState,
  DesktopTimerAction,
} from '~/shared/worklog'
import { DEFAULT_DESKTOP_CAPABILITIES } from '~/shared/worklog'

const api: DesktopApi = {
  getCapabilities() {
    return {
      ...DEFAULT_DESKTOP_CAPABILITIES,
      isDesktop: true,
      routeRequests: true,
    }
  },
  async getAlertSound() {
    return (await ipcRenderer.invoke('desktop:getAlertSound')) as Awaited<
      ReturnType<DesktopApi['getAlertSound']>
    >
  },
  async setTrayShortcuts(shortcuts) {
    await ipcRenderer.invoke('desktop:setTrayShortcuts', shortcuts)
  },
  async setTimerBridgeReady(isReady) {
    await ipcRenderer.invoke('desktop:setTimerBridgeReady', isReady)
  },
  async publishTimerState(state: ActiveTimerState, snapshot) {
    await ipcRenderer.invoke('desktop:publishTimerState', {
      state,
      snapshot,
    } satisfies DesktopPublishedTimerState)
  },
  async setCountdownDefaultMinutes(minutes) {
    await ipcRenderer.invoke('desktop:setCountdownDefaultMinutes', minutes)
  },
  subscribeToTimerAction(listener) {
    ipcRenderer.send('desktop:timerActionReady')

    const handler = (_event: IpcRendererEvent, payload: DesktopTimerAction) => {
      listener(payload)
    }

    ipcRenderer.on('desktop:timerAction', handler)

    return () => {
      ipcRenderer.removeListener('desktop:timerAction', handler)
    }
  },
  subscribeToRouteRequest(listener) {
    const handler = (_event: IpcRendererEvent, path: string) => {
      listener(path)
    }

    ipcRenderer.on('app:navigate', handler)

    return () => {
      ipcRenderer.removeListener('app:navigate', handler)
    }
  },
  async chooseAlertSound() {
    return (await ipcRenderer.invoke('desktop:chooseAlertSound')) as Awaited<
      ReturnType<DesktopApi['chooseAlertSound']>
    >
  },
  async clearAlertSound() {
    return (await ipcRenderer.invoke('desktop:clearAlertSound')) as Awaited<
      ReturnType<DesktopApi['clearAlertSound']>
    >
  },
  async testAlertSound() {
    await ipcRenderer.invoke('desktop:testAlertSound')
  },
}

contextBridge.exposeInMainWorld('worklogDesktop', api)
