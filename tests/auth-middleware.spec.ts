import type { RouteLocationNormalized } from 'vue-router'

const mocks = {
  getCurrentUser: vi.fn(),
  navigateTo: vi.fn((location: unknown) => location),
}

const { default: authMiddleware } = await import('~/app/middleware/auth.global')

const createRoute = (path: string, fullPath = path): RouteLocationNormalized =>
  ({
    path,
    fullPath,
  }) as RouteLocationNormalized

describe('auth middleware', () => {
  beforeEach(() => {
    ;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
      getCurrentUser: mocks.getCurrentUser,
      navigateTo: mocks.navigateTo,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('allows public anonymous routes without checking auth', async () => {
    const result = await authMiddleware(createRoute('/login'))

    expect(result).toBeUndefined()
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('does not redirect protected routes during SSR', async () => {
    const result = await authMiddleware(createRoute('/reports'))

    expect(result).toBeUndefined()
    expect(mocks.getCurrentUser).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects protected routes on the client when auth resolves to anonymous', async () => {
    vi.stubGlobal('window', {})
    mocks.getCurrentUser.mockResolvedValueOnce(null)

    const result = await authMiddleware(createRoute('/sessions', '/sessions?view=recent'))

    expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(mocks.navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/sessions?view=recent' },
    })
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/sessions?view=recent' },
    })
  })

  it('allows protected routes on the client when auth resolves to a user', async () => {
    vi.stubGlobal('window', {})
    mocks.getCurrentUser.mockResolvedValueOnce({ uid: 'user-123' })

    const result = await authMiddleware(createRoute('/reports'))

    expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(mocks.navigateTo).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})
