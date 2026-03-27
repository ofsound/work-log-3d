import { ref } from 'vue'

import { useTrayShortcutsEditor } from '~/app/composables/useTrayShortcutsEditor'
import { DEFAULT_USER_SETTINGS, cloneUserSettings } from '~~/shared/worklog'

describe('useTrayShortcutsEditor', () => {
  it('adds, reorders, and removes tray shortcuts while clearing messages', () => {
    const clearMessages = vi.fn()
    const draft = ref(cloneUserSettings(DEFAULT_USER_SETTINGS))
    const editor = useTrayShortcutsEditor({
      clearMessages,
      draft,
    })

    editor.addTrayShortcut()
    editor.addTrayShortcut()

    expect(draft.value.desktop.trayShortcuts).toHaveLength(2)
    expect(clearMessages).toHaveBeenCalledTimes(2)

    const [first, second] = draft.value.desktop.trayShortcuts

    expect(first).toBeTruthy()
    expect(second).toBeTruthy()

    first!.label = 'First'
    second!.label = 'Second'

    editor.moveTrayShortcut(1, -1)

    expect(draft.value.desktop.trayShortcuts[0]?.label).toBe('Second')

    editor.removeTrayShortcut(second!.id)

    expect(draft.value.desktop.trayShortcuts).toHaveLength(1)
    expect(draft.value.desktop.trayShortcuts[0]?.label).toBe('First')
  })

  it('defaults countdown shortcuts to 30 minutes and parses duration input', () => {
    const draft = ref(cloneUserSettings(DEFAULT_USER_SETTINGS))
    const editor = useTrayShortcutsEditor({
      clearMessages: vi.fn(),
      draft,
    })

    editor.addTrayShortcut()

    const shortcut = draft.value.desktop.trayShortcuts[0]!

    editor.setTrayShortcutTimerMode(shortcut, 'countdown')
    expect(shortcut.durationMinutes).toBe(30)

    editor.handleTrayShortcutDurationInput(shortcut, {
      target: { value: '45' },
    } as unknown as Event)

    expect(shortcut.durationMinutes).toBe(45)
  })
})
