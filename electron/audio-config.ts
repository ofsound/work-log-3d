import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { DesktopAlertSoundState } from '~/shared/worklog'

const TIMER_COMPLETE_SOUND_FILENAME = 'timer-complete.mp3'
const DESKTOP_SETTINGS_FILENAME = 'desktop-settings.json'
const CUSTOM_ALERT_SOUND_BASENAME = 'timer-alert'
const CUSTOM_ALERT_SOUND_DIRECTORY = 'sounds'
const SUPPORTED_ALERT_SOUND_EXTENSIONS = ['.mp3', '.wav', '.aiff', '.aif'] as const

interface DesktopSettingsFile {
  alertSoundFileName: string | null
  alertSoundOriginalName: string | null
}

const DEFAULT_DESKTOP_SETTINGS: DesktopSettingsFile = {
  alertSoundFileName: null,
  alertSoundOriginalName: null,
}

const getDesktopSettingsPath = (userDataPath: string) =>
  join(userDataPath, DESKTOP_SETTINGS_FILENAME)

const getDesktopAlertSoundDirectory = (userDataPath: string) =>
  join(userDataPath, CUSTOM_ALERT_SOUND_DIRECTORY)

const resolveBundledTimerCompleteSoundPath = () => {
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

const readDesktopSettings = async (userDataPath: string): Promise<DesktopSettingsFile> => {
  try {
    const raw = await readFile(getDesktopSettingsPath(userDataPath), 'utf8')
    const parsed = JSON.parse(raw) as Partial<DesktopSettingsFile>

    return {
      alertSoundFileName:
        typeof parsed.alertSoundFileName === 'string' ? parsed.alertSoundFileName : null,
      alertSoundOriginalName:
        typeof parsed.alertSoundOriginalName === 'string' ? parsed.alertSoundOriginalName : null,
    }
  } catch {
    return { ...DEFAULT_DESKTOP_SETTINGS }
  }
}

const writeDesktopSettings = async (userDataPath: string, settings: DesktopSettingsFile) => {
  const settingsPath = getDesktopSettingsPath(userDataPath)
  await mkdir(dirname(settingsPath), { recursive: true })
  await writeFile(settingsPath, JSON.stringify(settings, null, 2))
}

const getCustomAlertSoundPath = (userDataPath: string, settings: DesktopSettingsFile) => {
  if (!settings.alertSoundFileName) {
    return null
  }

  return join(getDesktopAlertSoundDirectory(userDataPath), settings.alertSoundFileName)
}

const removeCustomAlertSounds = async (userDataPath: string) => {
  await Promise.all(
    SUPPORTED_ALERT_SOUND_EXTENSIONS.map((extension) =>
      rm(
        join(
          getDesktopAlertSoundDirectory(userDataPath),
          `${CUSTOM_ALERT_SOUND_BASENAME}${extension}`,
        ),
        {
          force: true,
        },
      ),
    ),
  )
}

const getSupportedAlertSoundExtension = (filePath: string) => {
  const normalized = extname(filePath).toLowerCase()

  return SUPPORTED_ALERT_SOUND_EXTENSIONS.find((extension) => extension === normalized) ?? null
}

export async function getDesktopAlertSoundState(
  userDataPath: string,
): Promise<DesktopAlertSoundState> {
  const settings = await readDesktopSettings(userDataPath)
  const customPath = getCustomAlertSoundPath(userDataPath, settings)

  if (customPath && existsSync(customPath)) {
    return {
      source: 'custom',
      fileName: settings.alertSoundOriginalName ?? settings.alertSoundFileName ?? 'Custom alert',
      customFileName: settings.alertSoundOriginalName ?? settings.alertSoundFileName,
    }
  }

  return {
    source: 'bundled',
    fileName: TIMER_COMPLETE_SOUND_FILENAME,
    customFileName: null,
  }
}

export async function importDesktopAlertSound(
  userDataPath: string,
  sourcePath: string,
): Promise<DesktopAlertSoundState> {
  const extension = getSupportedAlertSoundExtension(sourcePath)

  if (!extension) {
    throw new Error('Alert sound must be an mp3, wav, or aiff file.')
  }

  const soundsDirectory = getDesktopAlertSoundDirectory(userDataPath)
  const targetFileName = `${CUSTOM_ALERT_SOUND_BASENAME}${extension}`
  const targetPath = join(soundsDirectory, targetFileName)

  await mkdir(soundsDirectory, { recursive: true })
  await removeCustomAlertSounds(userDataPath)
  await copyFile(sourcePath, targetPath)
  await writeDesktopSettings(userDataPath, {
    alertSoundFileName: targetFileName,
    alertSoundOriginalName: basename(sourcePath),
  })

  return getDesktopAlertSoundState(userDataPath)
}

export async function clearDesktopAlertSound(
  userDataPath: string,
): Promise<DesktopAlertSoundState> {
  await removeCustomAlertSounds(userDataPath)
  await writeDesktopSettings(userDataPath, { ...DEFAULT_DESKTOP_SETTINGS })

  return getDesktopAlertSoundState(userDataPath)
}

export async function resolveTimerCompleteSoundPath(userDataPath: string): Promise<string | null> {
  const settings = await readDesktopSettings(userDataPath)
  const customPath = getCustomAlertSoundPath(userDataPath, settings)

  if (customPath && existsSync(customPath)) {
    return customPath
  }

  return resolveBundledTimerCompleteSoundPath()
}
