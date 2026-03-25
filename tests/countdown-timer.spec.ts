// @vitest-environment jsdom

import { computed, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

import { toUserSettings } from '~/utils/worklog-firebase'
import { DEFAULT_USER_SETTINGS } from '~~/shared/worklog'

import type { UseMinuteVerticalDragOptions } from '~/app/composables/useMinuteVerticalDrag'
import type { FirebaseUserSettingsDocument } from '~/utils/worklog-firebase'

const buildRawDoc = (countdownDefaultMinutes: number): FirebaseUserSettingsDocument => ({
  appearance: {
    fontImportUrl: DEFAULT_USER_SETTINGS.appearance.fontImportUrl,
    fontFamilies: { ...DEFAULT_USER_SETTINGS.appearance.fontFamilies },
    backgroundPreset: DEFAULT_USER_SETTINGS.appearance.backgroundPreset,
  },
  workflow: {
    hideTags: DEFAULT_USER_SETTINGS.workflow.hideTags,
    countdownDefaultMinutes,
  },
  desktop: { trayShortcuts: [] },
})

const rawSettingsRef = ref<FirebaseUserSettingsDocument | null>(buildRawDoc(30))

const savedSettings = computed(() => toUserSettings(rawSettingsRef.value))

const saveSettings = vi.fn().mockResolvedValue(undefined)
const preferencesDocumentPending = ref(false)
const minutePointerSession = ref(false)
const minuteDragActive = ref(false)
let minuteDragOptions: UseMinuteVerticalDragOptions | null = null

const snapshot = ref({
  mode: null as null,
  status: 'idle' as const,
  startedAtMs: null,
  durationSeconds: null,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
  endedAtMs: null,
  display: '00:00',
  elapsedSeconds: 0,
  remainingSeconds: null,
  isActive: false,
})

  ; (globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
    useRoute: () => ({ path: '/new' }),
  }

vi.mock('~/composables/useMinuteVerticalDrag', () => ({
  useMinuteVerticalDrag: (options: UseMinuteVerticalDragOptions) => {
    minuteDragOptions = options

    return {
      pointerSessionActive: minutePointerSession,
      dragActive: minuteDragActive,
      onPointerDown: vi.fn(),
    }
  },
}))

vi.mock('~/composables/useHostRuntime', () => ({
  useHostRuntime: () => ({
    desktopApi: null,
    isDesktop: false,
    hasNativeTimer: false,
  }),
}))

vi.mock('~/composables/useTimerService', () => ({
  useTimerService: () => ({
    isReady: ref(true),
    snapshot,
    addCountdownMinutes: vi.fn(),
    cancel: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    startCountdown: vi.fn(),
  }),
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    rawSettings: rawSettingsRef,
    savedSettings,
    saveSettings,
    preferencesDocumentPending,
  }),
}))

const { default: CountdownTimer } = await import('~/app/components/CountdownTimer.vue')

describe('CountdownTimer', () => {
  beforeEach(() => {
    rawSettingsRef.value = buildRawDoc(30)
    preferencesDocumentPending.value = false
    minutePointerSession.value = false
    minuteDragActive.value = false
    minuteDragOptions = null
    snapshot.value = {
      mode: null,
      status: 'idle',
      startedAtMs: null,
      durationSeconds: null,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      display: '00:00',
      elapsedSeconds: 0,
      remainingSeconds: null,
      isActive: false,
    }
    saveSettings.mockClear()
    saveSettings.mockResolvedValue(undefined)
  })

  it('does not reset idle minutes after an idle drag when rawSettings churns with a stale countdown default', async () => {
    const wrapper = mount(CountdownTimer, {
      global: {
        stubs: {
          TimerCancelButton: true,
          TimerButton: true,
          ContainerCard: { template: '<div><slot /></div>' },
        },
      },
    })

    await nextTick()

    const drag = minuteDragOptions

    if (!drag) {
      throw new Error('Expected useMinuteVerticalDrag to be initialized.')
    }

    minutePointerSession.value = true
    drag.onSessionStart()
    minuteDragActive.value = true
    drag.onDrag(15)
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('45')

    minutePointerSession.value = false
    minuteDragActive.value = false
    drag.onSessionEnd({ deltaMinutes: 15, didDragBeyondThreshold: true })
    await nextTick()

    rawSettingsRef.value = {
      ...buildRawDoc(30),
      workflow: {
        ...buildRawDoc(30).workflow,
        hideTags: true,
      },
    }
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('45')

    rawSettingsRef.value = buildRawDoc(45)
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('45')
  })

  it('keeps the idle drag value when saving the countdown default is denied', async () => {
    saveSettings.mockRejectedValueOnce(new Error('Missing or insufficient permissions.'))

    const wrapper = mount(CountdownTimer, {
      global: {
        stubs: {
          TimerCancelButton: true,
          TimerButton: true,
          ContainerCard: { template: '<div><slot /></div>' },
        },
      },
    })

    await nextTick()

    const drag = minuteDragOptions

    if (!drag) {
      throw new Error('Expected useMinuteVerticalDrag to be initialized.')
    }

    minutePointerSession.value = true
    drag.onSessionStart()
    minuteDragActive.value = true
    drag.onDrag(15)
    await nextTick()

    minutePointerSession.value = false
    minuteDragActive.value = false
    drag.onSessionEnd({ deltaMinutes: 15, didDragBeyondThreshold: true })
    await Promise.resolve()
    await nextTick()

    rawSettingsRef.value = {
      ...buildRawDoc(30),
      workflow: {
        ...buildRawDoc(30).workflow,
        hideTags: true,
      },
    }
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('45')
  })

  it('does not reset idle minutes when typing before rawSettings catches up', async () => {
    const wrapper = mount(CountdownTimer, {
      global: {
        stubs: {
          TimerCancelButton: true,
          TimerButton: true,
          ContainerCard: { template: '<div><slot /></div>' },
        },
      },
    })

    await nextTick()

    const input = wrapper.get('#dynamicMinutes')
    await input.setValue('45')
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('45')

    rawSettingsRef.value = {
      ...buildRawDoc(30),
      workflow: {
        ...buildRawDoc(30).workflow,
        hideTags: true,
      },
    }
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('45')
  })

  it('syncs idle minutes from Firestore when the user has not edited locally', async () => {
    rawSettingsRef.value = buildRawDoc(30)

    const wrapper = mount(CountdownTimer, {
      global: {
        stubs: {
          TimerCancelButton: true,
          TimerButton: true,
          ContainerCard: { template: '<div><slot /></div>' },
        },
      },
    })

    await nextTick()
    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('30')

    rawSettingsRef.value = buildRawDoc(40)
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('40')
  })
})
