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

const addCountdownMinutes = vi.fn()
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
  originalDurationSeconds: null,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
  endedAtMs: null,
  lastExtensionConsumedSeconds: 0,
  display: '00:00',
  elapsedSeconds: 0,
  remainingSeconds: null,
  completionGapSeconds: null,
  isActive: false,
})

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
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
    addCountdownMinutes,
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

const mountCountdownTimer = () =>
  mount(CountdownTimer, {
    global: {
      stubs: {
        TimerCancelButton: { template: '<button @click="$emit(\'click\')">Cancel</button>' },
        TimerButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        ContainerCard: { template: '<div><slot /></div>' },
      },
    },
  })

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
      originalDurationSeconds: null,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 0,
      display: '00:00',
      elapsedSeconds: 0,
      remainingSeconds: null,
      completionGapSeconds: null,
      isActive: false,
    }
    addCountdownMinutes.mockClear()
    saveSettings.mockClear()
    saveSettings.mockResolvedValue(undefined)
  })

  it('does not reset idle minutes after an idle drag when rawSettings churns with a stale countdown default', async () => {
    const wrapper = mountCountdownTimer()

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

    const wrapper = mountCountdownTimer()

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
    const wrapper = mountCountdownTimer()

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

    const wrapper = mountCountdownTimer()

    await nextTick()
    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('30')

    rawSettingsRef.value = buildRawDoc(40)
    await nextTick()

    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('40')
  })

  it('does not show add-time buttons when the timer is idle', async () => {
    const wrapper = mountCountdownTimer()
    await nextTick()

    expect(wrapper.text()).toContain('Start Timer')
    expect(wrapper.text()).not.toContain('+5 min')
    expect(wrapper.text()).not.toContain('+10 min')
  })

  it('keeps completed countdowns in a read-only 00:00 state instead of restoring the Firestore default minutes', async () => {
    rawSettingsRef.value = buildRawDoc(30)

    const wrapper = mountCountdownTimer()

    await nextTick()
    expect((wrapper.get('#dynamicMinutes').element as HTMLInputElement).value).toBe('30')

    snapshot.value = {
      mode: 'countdown',
      status: 'completed',
      startedAtMs: 0,
      durationSeconds: 10,
      originalDurationSeconds: 10,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: 10_000,
      lastExtensionConsumedSeconds: 0,
      display: '00:00',
      elapsedSeconds: 10,
      remainingSeconds: 0,
      completionGapSeconds: 0,
      isActive: false,
    }
    await nextTick()

    expect(wrapper.find('#dynamicMinutes').exists()).toBe(false)
    expect(wrapper.text()).toContain('Originally 00:10')
  })

  it('shows completed countdown extension controls and summary text', async () => {
    const wrapper = mountCountdownTimer()

    snapshot.value = {
      mode: 'countdown',
      status: 'completed',
      startedAtMs: 0,
      durationSeconds: 3_000,
      originalDurationSeconds: 1_800,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: 3_000_000,
      lastExtensionConsumedSeconds: 900,
      display: '00:00',
      elapsedSeconds: 3_000,
      remainingSeconds: 0,
      completionGapSeconds: 120,
      isActive: false,
    }
    await nextTick()

    expect(wrapper.text()).toContain('Originally 30:00')
    expect(wrapper.text()).toContain('Added +20:00 total (50:00 total)')
    expect(wrapper.text()).toContain('02:00 elapsed since completion')
    expect(wrapper.text()).toContain('+5 min')
    expect(wrapper.text()).toContain('+10 min')
  })

  it('routes completed countdown extension buttons through addCountdownMinutes', async () => {
    const wrapper = mountCountdownTimer()

    snapshot.value = {
      mode: 'countdown',
      status: 'completed',
      startedAtMs: 0,
      durationSeconds: 3_000,
      originalDurationSeconds: 1_800,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: 3_000_000,
      lastExtensionConsumedSeconds: 900,
      display: '00:00',
      elapsedSeconds: 3_000,
      remainingSeconds: 0,
      completionGapSeconds: 120,
      isActive: false,
    }
    await nextTick()

    await wrapper.get('[data-testid="countdown-add-5"]').trigger('click')
    await wrapper.get('[data-testid="countdown-add-10"]').trigger('click')

    expect(addCountdownMinutes).toHaveBeenNthCalledWith(1, 5)
    expect(addCountdownMinutes).toHaveBeenNthCalledWith(2, 10)
  })

  it('shows the consumed extension note after a countdown is revived', async () => {
    const wrapper = mountCountdownTimer()

    snapshot.value = {
      mode: 'countdown',
      status: 'running',
      startedAtMs: 0,
      durationSeconds: 3_000,
      originalDurationSeconds: 1_800,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 900,
      display: '05:00',
      elapsedSeconds: 2_700,
      remainingSeconds: 300,
      completionGapSeconds: null,
      isActive: true,
    }
    await nextTick()

    expect(wrapper.text()).toContain('Originally 30:00')
    expect(wrapper.text()).toContain('Added +20:00 total (50:00 total)')
    expect(wrapper.text()).toContain('15:00 had already elapsed when you extended it')
    expect(wrapper.text()).toContain('+5 min')
    expect(wrapper.text()).toContain('+10 min')
  })

  it('shows add-time buttons for a paused countdown', async () => {
    const wrapper = mountCountdownTimer()

    snapshot.value = {
      mode: 'countdown',
      status: 'paused',
      startedAtMs: 0,
      durationSeconds: 300,
      originalDurationSeconds: 300,
      pausedAtMs: 60_000,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 0,
      display: '04:00',
      elapsedSeconds: 60,
      remainingSeconds: 240,
      completionGapSeconds: null,
      isActive: false,
    }
    await nextTick()

    expect(wrapper.text()).toContain('+5 min')
    expect(wrapper.text()).toContain('+10 min')
    expect(wrapper.text()).toContain('Resume Timer')
  })

  it('routes repeated +10 clicks on a running countdown through addCountdownMinutes', async () => {
    const wrapper = mountCountdownTimer()

    snapshot.value = {
      mode: 'countdown',
      status: 'running',
      startedAtMs: 0,
      durationSeconds: 300,
      originalDurationSeconds: 300,
      pausedAtMs: null,
      accumulatedPauseMs: 0,
      endedAtMs: null,
      lastExtensionConsumedSeconds: 0,
      display: '05:00',
      elapsedSeconds: 0,
      remainingSeconds: 300,
      completionGapSeconds: null,
      isActive: true,
    }
    await nextTick()

    const plusTen = wrapper.get('[data-testid="countdown-add-10"]')

    await plusTen.trigger('click')
    await plusTen.trigger('click')
    await plusTen.trigger('click')

    expect(addCountdownMinutes).toHaveBeenCalledTimes(3)
    expect(addCountdownMinutes).toHaveBeenNthCalledWith(1, 10)
    expect(addCountdownMinutes).toHaveBeenNthCalledWith(2, 10)
    expect(addCountdownMinutes).toHaveBeenNthCalledWith(3, 10)
  })
})
