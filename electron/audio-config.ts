import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * File name inside `electron/resources/` (copied next to the compiled main bundle on build).
 * Change this to use a different bundled asset (e.g. `alert.wav`).
 */
const TIMER_COMPLETE_SOUND_FILENAME = 'timer-complete.mp3'

/**
 * Optional absolute path to an alert sound. When set and the file exists, it is used instead
 * of the bundled `resources/` file. Later you can replace this with a value from user settings.
 */
const TIMER_COMPLETE_SOUND_PATH_OVERRIDE: string | null = null

export function resolveTimerCompleteSoundPath(): string | null {
  if (TIMER_COMPLETE_SOUND_PATH_OVERRIDE) {
    if (existsSync(TIMER_COMPLETE_SOUND_PATH_OVERRIDE)) {
      return TIMER_COMPLETE_SOUND_PATH_OVERRIDE
    }

    return null
  }

  const mainDir = dirname(fileURLToPath(import.meta.url))
  const bundled = join(mainDir, 'resources', TIMER_COMPLETE_SOUND_FILENAME)
  if (existsSync(bundled)) {
    return bundled
  }

  const dev = join(process.cwd(), 'electron/resources', TIMER_COMPLETE_SOUND_FILENAME)
  if (existsSync(dev)) {
    return dev
  }

  return null
}
