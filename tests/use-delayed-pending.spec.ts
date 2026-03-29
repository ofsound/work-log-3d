// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, ref } from 'vue'

const { useDelayedPending } = await import('~/app/composables/useDelayedPending')

const mountHarness = (pending: ReturnType<typeof ref<boolean>>) => {
  let state: ReturnType<typeof useDelayedPending> | null = null

  const Harness = defineComponent({
    setup() {
      state = useDelayedPending(computed(() => pending.value))

      return () => null
    },
  })

  return {
    pending,
    getState: () => state!,
    wrapper: mount(Harness),
  }
}

describe('useDelayedPending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays hidden before the delay and becomes visible once the delay elapses', async () => {
    const pending = ref(true)
    const { getState, wrapper } = mountHarness(pending)

    expect(getState().showPending.value).toBe(false)

    vi.advanceTimersByTime(179)
    await nextTick()

    expect(getState().showPending.value).toBe(false)

    vi.advanceTimersByTime(1)
    await nextTick()

    expect(getState().showPending.value).toBe(true)

    wrapper.unmount()
  })

  it('never appears when pending resolves before the delay completes', async () => {
    const pending = ref(true)
    const { getState, wrapper } = mountHarness(pending)

    vi.advanceTimersByTime(90)
    pending.value = false
    await nextTick()

    vi.advanceTimersByTime(200)
    await nextTick()

    expect(getState().showPending.value).toBe(false)

    wrapper.unmount()
  })

  it('stays visible for the minimum duration after pending resolves', async () => {
    const pending = ref(true)
    const { getState, wrapper } = mountHarness(pending)

    vi.advanceTimersByTime(180)
    await nextTick()

    expect(getState().showPending.value).toBe(true)

    pending.value = false
    await nextTick()

    expect(getState().showPending.value).toBe(true)

    vi.advanceTimersByTime(119)
    await nextTick()

    expect(getState().showPending.value).toBe(true)

    vi.advanceTimersByTime(1)
    await nextTick()

    expect(getState().showPending.value).toBe(false)

    wrapper.unmount()
  })
})
