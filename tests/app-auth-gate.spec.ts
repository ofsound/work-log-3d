// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const currentUser = ref<null | { uid: string } | undefined>(undefined)
const route = { path: '/' }

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () => currentUser,
  useRoute: () => route,
}

const { default: AppRoot } = await import('~/app/app.vue')

describe('app auth route gate', () => {
  beforeEach(() => {
    currentUser.value = undefined
    route.path = '/'
  })

  it('renders public anonymous routes before auth resolves', () => {
    route.path = '/login'

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtPage: { template: '<div data-test="page" />' },
        },
      },
    })

    expect(wrapper.find('[data-test="page"]').exists()).toBe(true)
  })

  it('holds protected routes while auth is unresolved', () => {
    route.path = '/sessions'

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtPage: { template: '<div data-test="page" />' },
        },
      },
    })

    expect(wrapper.find('[data-test="page"]').exists()).toBe(false)
  })

  it('holds protected routes for anonymous users until redirect completes', () => {
    route.path = '/sessions'
    currentUser.value = null

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtPage: { template: '<div data-test="page" />' },
        },
      },
    })

    expect(wrapper.find('[data-test="page"]').exists()).toBe(false)
  })

  it('renders protected routes once a user is available', () => {
    route.path = '/sessions'
    currentUser.value = { uid: 'user-123' }

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          NuxtLayout: { template: '<div><slot /></div>' },
          NuxtPage: { template: '<div data-test="page" />' },
        },
      },
    })

    expect(wrapper.find('[data-test="page"]').exists()).toBe(true)
  })
})
