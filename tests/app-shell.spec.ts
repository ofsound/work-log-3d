// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    effectiveShellBackgroundPreset: ref('grid'),
  }),
}))

const currentUser = ref<null | { uid: string } | undefined>(undefined)
const route = reactive({
  path: '/sessions',
})

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () => currentUser,
  useRoute: () => route,
}

const { default: AppShell } = await import('~/app/components/AppShell.vue')

describe('AppShell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    currentUser.value = undefined
    route.path = '/sessions'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not show the protected fallback on public anonymous routes', async () => {
    route.path = '/login'

    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          ContainerCard: {
            template: '<div v-bind="$attrs"><slot /></div>',
          },
          HeaderBar: {
            template: '<div data-test="header-bar" />',
          },
        },
      },
      slots: {
        default: '<div data-test="public-slot">Public content</div>',
      },
    })

    await nextTick()
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.find('[data-shell-pending]').exists()).toBe(false)
    expect(wrapper.find('[data-test="public-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="header-bar"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('keeps protected content hidden until auth resolves and uses a non-textual fallback', async () => {
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          ContainerCard: {
            template: '<div v-bind="$attrs"><slot /></div>',
          },
          HeaderBar: {
            template: '<div data-test="header-bar" />',
          },
        },
      },
      slots: {
        default: '<div data-test="protected-slot">Protected content</div>',
      },
    })

    await nextTick()

    expect(wrapper.find('[data-test="protected-slot"]').exists()).toBe(false)
    expect(wrapper.find('[data-shell-pending]').exists()).toBe(false)

    vi.advanceTimersByTime(180)
    await nextTick()

    expect(wrapper.find('[data-shell-pending]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Loading')
    expect(wrapper.find('[data-test="protected-slot"]').exists()).toBe(false)

    currentUser.value = { uid: 'user-123' }
    await nextTick()

    expect(wrapper.find('[data-test="protected-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="header-bar"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
