import { createRequire } from 'node:module'

import { shell } from 'electron'

import { resolveTimerCompleteSoundPath } from './audio-config'

const require = createRequire(import.meta.url)
const createPlayer = require('play-sound') as (opts?: Record<string, unknown>) => {
  play: (path: string, callback: (err: Error | null) => void) => void
}

let player: ReturnType<typeof createPlayer> | null = null

const getPlayer = () => {
  if (!player) {
    player = createPlayer({})
  }

  return player
}

export const playTimerCompleteAlert = async (userDataPath: string): Promise<void> => {
  const soundPath = await resolveTimerCompleteSoundPath(userDataPath)

  if (!soundPath) {
    shell.beep()
    return
  }

  await new Promise<void>((resolve) => {
    getPlayer().play(soundPath, (err) => {
      if (err) {
        console.error('[worklog] timer alert sound failed', err)
        shell.beep()
      }

      resolve()
    })
  })
}
