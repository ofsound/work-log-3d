import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { playTimerCompleteAlert } from '../electron/play-timer-alert'

const { spawnMock, beepMock, resolvePathMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  beepMock: vi.fn(),
  resolvePathMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}))

vi.mock('electron', () => ({
  shell: { beep: beepMock },
}))

vi.mock('../electron/audio-config', () => ({
  resolveTimerCompleteSoundPath: (...args: unknown[]) => resolvePathMock(...args),
}))

describe('playTimerCompleteAlert', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    spawnMock.mockReset()
    beepMock.mockReset()
    resolvePathMock.mockReset()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('uses afplay on macOS when a sound path is available', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    resolvePathMock.mockResolvedValue('/path/to/sound.wav')

    spawnMock.mockImplementation(() => {
      const child = new EventEmitter() as ChildProcess
      queueMicrotask(() => child.emit('close', 0))
      return child
    })

    await playTimerCompleteAlert('/userData', null)

    expect(spawnMock).toHaveBeenCalledWith('afplay', ['/path/to/sound.wav'], { stdio: 'ignore' })
    expect(beepMock).not.toHaveBeenCalled()
  })

  it('falls back to beep when afplay exits non-zero on macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    resolvePathMock.mockResolvedValue('/path/to/sound.wav')

    spawnMock.mockImplementation(() => {
      const child = new EventEmitter() as ChildProcess
      queueMicrotask(() => child.emit('close', 1))
      return child
    })

    await playTimerCompleteAlert('/userData', null)

    expect(beepMock).toHaveBeenCalled()
  })

  it('beeps when no sound path on macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    resolvePathMock.mockResolvedValue(null)

    await playTimerCompleteAlert('/userData', null)

    expect(spawnMock).not.toHaveBeenCalled()
    expect(beepMock).toHaveBeenCalled()
  })
})
