import type { Ref } from 'vue'

import type {
  UserSettings,
  UserSettingsTrayShortcut,
  UserSettingsTrayShortcutTimerMode,
} from '~~/shared/worklog'

export interface UseTrayShortcutsEditorOptions {
  clearMessages: () => void
  draft: Ref<UserSettings>
}

const createTrayShortcutId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `tray-shortcut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const createTrayShortcut = (): UserSettingsTrayShortcut => ({
  id: createTrayShortcutId(),
  label: '',
  timerMode: 'countup',
  durationMinutes: null,
  project: '',
  tags: [],
})

export function useTrayShortcutsEditor(options: UseTrayShortcutsEditorOptions) {
  const addTrayShortcut = () => {
    options.draft.value.desktop.trayShortcuts = [
      ...options.draft.value.desktop.trayShortcuts,
      createTrayShortcut(),
    ]
    options.clearMessages()
  }

  const removeTrayShortcut = (shortcutId: string) => {
    options.draft.value.desktop.trayShortcuts = options.draft.value.desktop.trayShortcuts.filter(
      (shortcut) => shortcut.id !== shortcutId,
    )
    options.clearMessages()
  }

  const moveTrayShortcut = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction

    if (nextIndex < 0 || nextIndex >= options.draft.value.desktop.trayShortcuts.length) {
      return
    }

    const nextShortcuts = [...options.draft.value.desktop.trayShortcuts]
    const currentShortcut = nextShortcuts[index]!
    nextShortcuts[index] = nextShortcuts[nextIndex]!
    nextShortcuts[nextIndex] = currentShortcut
    options.draft.value.desktop.trayShortcuts = nextShortcuts
    options.clearMessages()
  }

  const setTrayShortcutTimerMode = (
    shortcut: UserSettingsTrayShortcut,
    timerMode: UserSettingsTrayShortcutTimerMode,
  ) => {
    shortcut.timerMode = timerMode
    shortcut.durationMinutes = timerMode === 'countdown' ? (shortcut.durationMinutes ?? 30) : null
    options.clearMessages()
  }

  const handleTrayShortcutDurationInput = (shortcut: UserSettingsTrayShortcut, event: Event) => {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10)
    shortcut.durationMinutes = Number.isFinite(value) ? value : null
    options.clearMessages()
  }

  return {
    addTrayShortcut,
    handleTrayShortcutDurationInput,
    moveTrayShortcut,
    removeTrayShortcut,
    setTrayShortcutTimerMode,
  }
}
