import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { shell } from 'electron'
import type { BrowserWindow } from 'electron'

import { resolveTimerCompleteSoundPath } from './audio-config'
const PLAYBACK_TIMEOUT_MS = 15000
const SOUND_MIME_TYPES: Record<string, string> = {
  '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

const waitForWindowToLoad = async (window: BrowserWindow) => {
  if (window.isDestroyed() || !window.webContents.isLoadingMainFrame()) {
    return
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      window.webContents.removeListener('did-finish-load', handleDidFinishLoad)
      resolve()
    }, PLAYBACK_TIMEOUT_MS)

    const handleDidFinishLoad = () => {
      clearTimeout(timeout)
      resolve()
    }

    window.webContents.once('did-finish-load', handleDidFinishLoad)
  })
}

const getSoundDataUrl = async (soundPath: string) => {
  const mimeType = SOUND_MIME_TYPES[extname(soundPath).toLowerCase()] ?? 'audio/mpeg'
  const soundBuffer = await readFile(soundPath)

  return `data:${mimeType};base64,${soundBuffer.toString('base64')}`
}

const playAlertThroughWindow = async (window: BrowserWindow, soundPath: string) => {
  await waitForWindowToLoad(window)

  if (window.isDestroyed()) {
    throw new Error('Desktop window is not available for alert playback.')
  }

  const soundDataUrl = await getSoundDataUrl(soundPath)
  const playbackScript = `(() => {
    const soundSource = ${JSON.stringify(soundDataUrl)};
    const playbackKey = '__worklogDesktopAlertAudio';
    const existingAudio = globalThis[playbackKey];

    if (existingAudio && typeof existingAudio.pause === 'function') {
      existingAudio.pause();
      existingAudio.currentTime = 0;
    }

    const audio = new Audio(soundSource);
    audio.preload = 'auto';
    globalThis[playbackKey] = audio;

    return audio.play().then(() => undefined);
  })()`

  await window.webContents.executeJavaScript(playbackScript, true)
}

export const playTimerCompleteAlert = async (
  userDataPath: string,
  window?: BrowserWindow | null,
): Promise<void> => {
  const soundPath = await resolveTimerCompleteSoundPath(userDataPath)

  if (!soundPath) {
    shell.beep()
    return
  }

  if (window) {
    try {
      await playAlertThroughWindow(window, soundPath)
      return
    } catch (error) {
      console.error('[worklog] timer alert sound failed in renderer', error)
    }
  }

  shell.beep()
}
