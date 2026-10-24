// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

import {
  addCountupSeconds,
  createIdleTimerState,
  getTimerSnapshot,
  pauseTimer,
  startCountupTimer,
} from '~~/shared/worklog'

const state = ref(startCountupTimer(1_000_000))
const nowMs = ref(1_060_000)
const isReady = ref(true)
const addCountupMinutes = vi.fn(async (minutes: number) => {
  state.value = addCountupSeconds(state.value, minutes * 60, nowMs.value)
})
vi.mock('~/composables/useTimerService', () => ({
  useTimerService: () => ({
    isReady,
    snapshot: computed(() => getTimerSnapshot(state.value, nowMs.value)),
    addCountupMinutes,
    cancel: vi.fn(),
    resume: vi.fn(),
    startCountup: vi.fn(),
    stop: vi.fn(),
  }),
}))
const { default: CountupTimer } = await import('~/components/CountupTimer.vue')
const mountTimer = () =>
  mount(CountupTimer, {
    global: {
      stubs: {
        ContainerCard: { template: '<div><slot /></div>' },
        AppButton: { template: '<button v-bind="$attrs"><slot /></button>' },
        TimerCancelButton: { template: '<button>Cancel</button>' },
        TimerButton: { template: '<button><slot /></button>' },
      },
    },
  })

beforeEach(() => {
  state.value = startCountupTimer(1_000_000)
  nowMs.value = 1_060_000
  isReady.value = true
  addCountupMinutes.mockClear()
})

describe('countup missed-time controls', () => {
  it('adds five and ten minutes without stopping the running timer', async () => {
    const wrapper = mountTimer()
    await wrapper.get('[data-testid="countup-add-5"]').trigger('click')
    await wrapper.get('[data-testid="countup-add-10"]').trigger('click')
    expect(addCountupMinutes.mock.calls).toEqual([[5], [10]])
    expect(state.value.status).toBe('running')
    expect(wrapper.text()).toContain('16:00')
    nowMs.value += 60_000
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('17:00')
    wrapper.unmount()
  })

  it('also adds missed time while paused without resuming', async () => {
    state.value = pauseTimer(state.value, nowMs.value)
    const wrapper = mountTimer()
    await wrapper.get('[data-testid="countup-add-5"]').trigger('click')
    expect(state.value.status).toBe('paused')
    expect(wrapper.text()).toContain('06:00')
    expect(wrapper.text()).toContain('Resume')
    wrapper.unmount()
  })

  it('hides adjustment controls before starting and until the service is ready', async () => {
    const wrapper = mountTimer()
    isReady.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="countup-add-5"]').exists()).toBe(false)
    isReady.value = true
    state.value = createIdleTimerState()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="countup-add-10"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('previews a relative drag while running and commits only once on release', async () => {
    const wrapper = mountTimer()
    wrapper
      .get('[data-testid="countup-drag-readout"]')
      .element.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }),
      )
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 70 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('06:00')
    expect(addCountupMinutes).not.toHaveBeenCalled()
    nowMs.value += 2000
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 40 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('11:02')
    window.dispatchEvent(new MouseEvent('pointerup', { clientY: 40 }))
    await wrapper.vm.$nextTick()
    expect(addCountupMinutes.mock.calls).toEqual([[10]])
    expect(state.value.status).toBe('running')
    expect(wrapper.text()).toContain('11:02')
    wrapper.unmount()
  })

  it('subtracts from a stopped timer with a downward drag and clamps at zero', async () => {
    state.value = pauseTimer(state.value, nowMs.value)
    const wrapper = mountTimer()
    wrapper
      .get('[data-testid="countup-drag-readout"]')
      .element.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }),
      )
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 130 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('00:00')
    window.dispatchEvent(new MouseEvent('pointerup', { clientY: 130 }))
    await wrapper.vm.$nextTick()
    expect(addCountupMinutes.mock.calls).toEqual([[-5]])
    expect(state.value.status).toBe('paused')
    expect(getTimerSnapshot(state.value, nowMs.value).elapsedSeconds).toBe(0)
    wrapper.unmount()
  })

  it('does not adjust on a click, small pointer motion, or before the timer starts', async () => {
    const wrapper = mountTimer()
    const readout = wrapper.get('[data-testid="countup-drag-readout"]')
    readout.element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }),
    )
    window.dispatchEvent(new MouseEvent('pointerup', { clientY: 103 }))
    expect(addCountupMinutes).not.toHaveBeenCalled()
    state.value = createIdleTimerState()
    await wrapper.vm.$nextTick()
    readout.element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }),
    )
    window.dispatchEvent(new MouseEvent('pointermove', { clientY: 40 }))
    window.dispatchEvent(new MouseEvent('pointerup', { clientY: 40 }))
    expect(addCountupMinutes).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it.each(['pointercancel', 'blur'])(
    'discards the drag on %s and ignores a later pointer release',
    async (eventType) => {
      if (eventType === 'blur') state.value = pauseTimer(state.value, nowMs.value)
      const wrapper = mountTimer()
      wrapper
        .get('[data-testid="countup-drag-readout"]')
        .element.dispatchEvent(
          new MouseEvent('pointerdown', { bubbles: true, button: 0, clientY: 100 }),
        )
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 70 }))
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('06:00')
      window.dispatchEvent(new MouseEvent(eventType, { clientY: 0 }))
      await wrapper.vm.$nextTick()
      expect(addCountupMinutes).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('01:00')
      window.dispatchEvent(new MouseEvent('pointerup', { clientY: 0 }))
      expect(addCountupMinutes).not.toHaveBeenCalled()
      wrapper.unmount()
    },
  )
})
