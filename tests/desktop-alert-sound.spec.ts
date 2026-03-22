import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  clearDesktopAlertSound,
  getDesktopAlertSoundState,
  importDesktopAlertSound,
  resolveTimerCompleteSoundPath,
} from '~/electron/audio-config'

describe('desktop alert sound config', () => {
  it('imports a custom sound into app-managed storage and clears it', async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), 'worklog-alert-'))
    const sourcePath = join(userDataPath, 'custom-alert.wav')

    await writeFile(sourcePath, 'demo-audio')

    const importedState = await importDesktopAlertSound(userDataPath, sourcePath)

    expect(importedState.source).toBe('custom')
    expect(importedState.fileName).toBe('custom-alert.wav')
    await expect(resolveTimerCompleteSoundPath(userDataPath)).resolves.toContain(
      'sounds/timer-alert.wav',
    )

    const clearedState = await clearDesktopAlertSound(userDataPath)

    expect(clearedState.source).toBe('bundled')
    expect(clearedState.customFileName).toBeNull()
  })

  it('falls back to the bundled sound when no custom file is configured', async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), 'worklog-alert-'))

    expect(await getDesktopAlertSoundState(userDataPath)).toEqual({
      source: 'bundled',
      fileName: 'timer-complete.mp3',
      customFileName: null,
    })
    await expect(resolveTimerCompleteSoundPath(userDataPath)).resolves.toContain(
      'timer-complete.mp3',
    )
  })
})
