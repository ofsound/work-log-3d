import { contextBridge, ipcRenderer } from 'electron'

import type { IpcRendererEvent } from 'electron'
import type { DesktopApi, DesktopTimerEvent, TimerState } from '~/shared/worklog'
import { DEFAULT_DESKTOP_CAPABILITIES } from '~/shared/worklog'

const api: DesktopApi = {
  getCapabilities() {
    return {
      ...DEFAULT_DESKTOP_CAPABILITIES,
      isDesktop: true,
      nativeTimer: true,
      routeRequests: true,
    }
  },
  async getTimerState() {
    return (await ipcRenderer.invoke('timer:getState')) as TimerState
  },
  subscribeToTimer(listener) {
    const handler = (_event: IpcRendererEvent, payload: DesktopTimerEvent) => {
      listener(payload)
    }

    ipcRenderer.on('timer:state', handler)

    return () => {
      ipcRenderer.removeListener('timer:state', handler)
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
  async startCountup() {
    await ipcRenderer.invoke('timer:startCountup')
  },
  async startCountdown(durationSeconds) {
    await ipcRenderer.invoke('timer:startCountdown', durationSeconds)
  },
  async pauseTimer() {
    await ipcRenderer.invoke('timer:pause')
  },
  async resumeTimer() {
    await ipcRenderer.invoke('timer:resume')
  },
  async stopTimer() {
    await ipcRenderer.invoke('timer:stop')
  },
  async cancelTimer() {
    await ipcRenderer.invoke('timer:cancel')
  },
}

contextBridge.exposeInMainWorld('worklogDesktop', api)
