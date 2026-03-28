import type { RouteLocationNormalized } from 'vue-router'

const mocks = {
  navigateTo: vi.fn((location: unknown, options?: unknown) => ({ location, options })),
}

const { default: phoneModeMiddleware } = await import('~/app/middleware/phone-mode.global')

const createRoute = (
  path: string,
  query: Record<string, string | string[] | undefined> = {},
  params: Record<string, string | string[] | undefined> = {},
): RouteLocationNormalized =>
  ({
    path,
    fullPath: path,
    params,
    query,
  }) as RouteLocationNormalized

describe('phone mode middleware', () => {
  beforeEach(() => {
    ;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
      navigateTo: mocks.navigateTo,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not redirect during SSR', async () => {
    const result = await phoneModeMiddleware(createRoute('/reports'))

    expect(result).toBeUndefined()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects unsupported phone routes on the client', async () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query === '(max-width: 767px)' || query === '(hover: none) and (pointer: coarse)',
      }),
    })

    const result = await phoneModeMiddleware(
      createRoute('/project/client-portal/edit', { mode: 'calendar' }, { id: 'client-portal' }),
    )

    expect(mocks.navigateTo).toHaveBeenCalledWith(
      {
        path: '/project/client-portal',
        query: {},
      },
      { replace: true },
    )
    expect(result).toEqual({
      location: {
        path: '/project/client-portal',
        query: {},
      },
      options: { replace: true },
    })
  })

  it('allows supported routes even on phone', async () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query === '(max-width: 767px)' || query === '(hover: none) and (pointer: coarse)',
      }),
    })

    const result = await phoneModeMiddleware(createRoute('/tags'))

    expect(result).toBeUndefined()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})
