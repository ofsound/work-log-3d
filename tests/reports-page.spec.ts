// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const hasResolvedViewport = ref(false)
const isPhoneMode = ref(false)

vi.mock('~/composables/usePhoneMode', () => ({
  usePhoneMode: () => ({
    hasResolvedViewport,
    isPhoneMode,
  }),
}))

const { default: ReportsPage } = await import('~/app/pages/reports.vue')

describe('reports page route hold', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    hasResolvedViewport.value = false
    isPhoneMode.value = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits before showing the phone-route fallback while viewport resolution is pending', async () => {
    const wrapper = mount(ReportsPage, {
      global: {
        stubs: {
          PhoneRouteLoading: {
            template: '<div data-test="phone-route-loading" />',
          },
          ReportsWorkspace: {
            template: '<div data-test="reports-workspace" />',
          },
        },
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="phone-route-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="reports-workspace"]').exists()).toBe(false)

    vi.advanceTimersByTime(179)
    await nextTick()

    expect(wrapper.find('[data-test="phone-route-loading"]').exists()).toBe(false)

    vi.advanceTimersByTime(1)
    await nextTick()

    expect(wrapper.find('[data-test="phone-route-loading"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders the reports workspace immediately once viewport resolution is complete', async () => {
    hasResolvedViewport.value = true

    const wrapper = mount(ReportsPage, {
      global: {
        stubs: {
          PhoneRouteLoading: {
            template: '<div data-test="phone-route-loading" />',
          },
          ReportsWorkspace: {
            template: '<div data-test="reports-workspace" />',
          },
        },
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="reports-workspace"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="phone-route-loading"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
