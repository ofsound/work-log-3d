import { Menu, Tray } from 'electron'

import { createTrayController } from '../electron/tray-controller'
import { createIdleTimerState, getTimerSnapshot, startCountupTimer } from '../shared/worklog'

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  return {
    Menu: {
      buildFromTemplate: vi.fn((items) => Object.assign(new EventEmitter(), { items })),
    },
    Tray: vi.fn(function () {
      return Object.assign(new EventEmitter(), {
        setContextMenu: vi.fn(),
        setIgnoreDoubleClickEvents: vi.fn(),
        popUpContextMenu: vi.fn(),
        setTitle: vi.fn(),
        setToolTip: vi.fn(),
        destroy: vi.fn(),
      })
    }),
    nativeImage: {
      createFromPath: () => ({ isEmpty: () => false, setTemplateImage: vi.fn() }),
      createFromDataURL: () => ({ resize: () => ({}) }),
    },
  }
})

beforeEach(() => vi.clearAllMocks())

it('uses only explicit menu opening on macOS and defers replacement until the menu closes', () => {
  const controller = createTrayController({ platform: 'darwin', onAction: vi.fn() })
  controller.sync(getTimerSnapshot(createIdleTimerState(), 0))
  const tray = vi.mocked(Tray).mock.results[0]!.value
  const idleMenu = vi.mocked(Menu.buildFromTemplate).mock.results.at(-1)!.value
  expect(tray.setContextMenu).not.toHaveBeenCalled()
  tray.emit('click')
  expect(tray.popUpContextMenu).toHaveBeenCalledExactlyOnceWith(idleMenu)

  idleMenu.emit('menu-will-show')
  tray.emit('right-click')
  expect(tray.popUpContextMenu).toHaveBeenCalledTimes(1)
  const buildsBefore = vi.mocked(Menu.buildFromTemplate).mock.calls.length
  controller.sync(getTimerSnapshot(startCountupTimer(0), 60_000))
  controller.sync(getTimerSnapshot(startCountupTimer(0), 120_000))
  expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(buildsBefore)
  expect(idleMenu.items.some((item: { label?: string }) => item.label === 'Stop')).toBe(false)

  idleMenu.emit('menu-will-close')
  expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(buildsBefore + 1)
  const runningMenu = vi.mocked(Menu.buildFromTemplate).mock.results.at(-1)!.value
  expect(runningMenu.items.some((item: { label?: string }) => item.label === 'Stop')).toBe(true)
  expect(tray.setTitle).toHaveBeenLastCalledWith(' 02:00', { fontType: 'monospacedDigit' })
  controller.destroy()
})

it('keeps the native context menu on Windows without a second right-click popup handler', () => {
  const controller = createTrayController({ platform: 'win32', onAction: vi.fn() })
  controller.sync(getTimerSnapshot(createIdleTimerState(), 0))
  const tray = vi.mocked(Tray).mock.results[0]!.value
  expect(tray.setContextMenu).toHaveBeenCalledTimes(1)
  expect(tray.listenerCount('right-click')).toBe(0)
  controller.destroy()
})
