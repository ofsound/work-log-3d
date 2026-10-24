import { flushPromises } from '@vue/test-utils'
import { computed, effectScope, ref, watch } from 'vue'

import {
  addCountupSeconds,
  applyActiveTimerDraft,
  createIdleActiveTimerState,
  getTimerSnapshot,
  pauseTimer,
  replaceActiveTimerState,
  startCountupTimer,
} from '~~/shared/worklog'

const nowMs = 1_060_000
const timerState = ref(createIdleActiveTimerState())
const isPersistentReady = ref(true)
const addCountupMinutes = vi.fn(async (minutes: number) => {
  timerState.value = replaceActiveTimerState(
    timerState.value,
    addCountupSeconds(timerState.value, minutes * 60, nowMs),
  )
})
const desktopApi = {
  setTimerBridgeReady: vi.fn(async () => {}),
  consumePendingTimerActions: vi.fn(),
  ackTimerAction: vi.fn(async () => {}),
  subscribeToTimerAction: vi.fn(),
  publishTimerState: vi.fn(async () => {}),
}
vi.mock('~/composables/useHostRuntime', () => ({
  useHostRuntime: () => ({ isDesktop: true, desktopApi }),
}))
vi.mock('~/composables/useTimerService', () => ({
  useTimerService: () => ({
    timerState,
    isPersistentReady,
    snapshot: computed(() => getTimerSnapshot(timerState.value, nowMs)),
    addCountupMinutes,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('defineNuxtPlugin', (setup: () => void) => setup)
  vi.stubGlobal('watch', watch)
  desktopApi.consumePendingTimerActions
    .mockResolvedValueOnce([
      { id: 1, action: { type: 'add_countup_time', durationSeconds: 300 } },
      { id: 2, action: { type: 'add_countup_time', durationSeconds: 600 } },
    ])
    .mockResolvedValue([])
})
afterEach(() => vi.unstubAllGlobals())

it.each(['running', 'paused'] as const)(
  'applies queued tray +5/+10 actions to a %s countup and republishes state',
  async (status) => {
    const started = startCountupTimer(1_000_000)
    timerState.value = applyActiveTimerDraft(
      replaceActiveTimerState(
        createIdleActiveTimerState(),
        status === 'paused' ? pauseTimer(started, nowMs) : started,
      ),
      { project: 'project-1', tags: ['tag-1'], draftNotes: 'Late start ' },
    )
    const { default: plugin } = await import('~/app/plugins/desktop-active-timer.client')
    const scope = effectScope()
    try {
      scope.run(() => (plugin as unknown as () => void)())
      await flushPromises()
      expect(addCountupMinutes.mock.calls).toEqual([[5], [10]])
      expect(desktopApi.ackTimerAction.mock.calls).toEqual([[1], [2]])
      expect(timerState.value.status).toBe(status)
      expect(timerState.value.startedAtMs).toBe(100_000)
      expect(timerState.value.draftNotes).toBe('Late start ')
      expect(desktopApi.publishTimerState).toHaveBeenLastCalledWith(
        expect.objectContaining({ startedAtMs: 100_000, project: 'project-1', tags: ['tag-1'] }),
        expect.objectContaining({ display: '16:00', status }),
      )
    } finally {
      scope.stop()
    }
  },
)
