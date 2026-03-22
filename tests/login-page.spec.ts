// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const currentUser = ref<null | { uid: string } | undefined>(undefined)
const route = { query: {} as Record<string, unknown> }
const routerPush = vi.fn()
const createUserWithEmailAndPassword = vi.fn()
const signInWithEmailAndPassword = vi.fn()
const signInWithPopup = vi.fn()
;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCurrentUser: () => currentUser,
  useFirebaseAuth: () => ({}),
  useRoute: () => route,
  useRouter: () => ({ push: routerPush }),
}

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: function GoogleAuthProvider() {},
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
}))

const { default: LoginPage } = await import('~/app/pages/login.vue')

describe('login page auth state', () => {
  beforeEach(() => {
    currentUser.value = undefined
    route.query = {}
    routerPush.mockReset()
    createUserWithEmailAndPassword.mockReset()
    signInWithEmailAndPassword.mockReset()
    signInWithPopup.mockReset()
  })

  it('shows a loading state while auth is unresolved', () => {
    const wrapper = mount(LoginPage)

    expect(wrapper.text()).toContain('Checking session...')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows the sign-in form once auth resolves to anonymous', async () => {
    currentUser.value = null

    const wrapper = mount(LoginPage)
    await nextTick()

    expect(wrapper.text()).toContain('Sign in to continue')
    expect(wrapper.find('form').exists()).toBe(true)
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('redirects authenticated users to the requested path', async () => {
    currentUser.value = { uid: 'user-123' }
    route.query = { redirect: '/projects' }

    mount(LoginPage)
    await nextTick()

    expect(routerPush).toHaveBeenCalledWith('/projects')
  })
})
