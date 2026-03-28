import {
  PHONE_MODE_TOUCH_QUERY,
  PHONE_MODE_VIEWPORT_QUERY,
  detectPhoneMode,
  getPhoneRedirectLocation,
  routeRequiresPhoneResolution,
} from '~/app/utils/phone-mode'

describe('phone mode policy', () => {
  it('treats narrow touch-first devices as phone mode', () => {
    const windowLike = {
      matchMedia: vi.fn((query: string) => ({
        matches: query === PHONE_MODE_VIEWPORT_QUERY || query === PHONE_MODE_TOUCH_QUERY,
      })),
    }

    expect(detectPhoneMode(windowLike)).toBe(true)
  })

  it('does not treat a narrow pointer-precise viewport as phone mode', () => {
    const windowLike = {
      matchMedia: vi.fn((query: string) => ({
        matches: query === PHONE_MODE_VIEWPORT_QUERY,
      })),
    }

    expect(detectPhoneMode(windowLike)).toBe(false)
  })

  it('redirects unsupported sessions views to day mode on phone', () => {
    const redirect = getPhoneRedirectLocation({
      path: '/sessions',
      query: {
        date: '2026-03-21',
        mode: 'week',
      },
    })

    expect(redirect).toEqual({
      path: '/sessions',
      query: {
        date: '2026-03-21',
      },
    })
  })

  it('redirects project calendar and edit routes to the list overview on phone', () => {
    expect(
      getPhoneRedirectLocation({
        path: '/project/client-portal',
        query: {
          mode: 'calendar',
          date: '2026-03-21',
        },
      }),
    ).toEqual({
      path: '/project/client-portal',
      query: {
        date: '2026-03-21',
      },
    })

    expect(
      getPhoneRedirectLocation({
        path: '/project/client-portal/edit',
        params: { id: 'client-portal' },
        query: {
          mode: 'calendar',
          date: '2026-03-21',
        },
      }),
    ).toEqual({
      path: '/project/client-portal',
      query: {
        date: '2026-03-21',
      },
    })
  })

  it('marks the desktop-only phone routes for viewport resolution', () => {
    expect(routeRequiresPhoneResolution({ path: '/reports' })).toBe(true)
    expect(
      routeRequiresPhoneResolution({
        path: '/sessions',
        query: { mode: 'month' },
      }),
    ).toBe(true)
    expect(routeRequiresPhoneResolution({ path: '/tags' })).toBe(false)
  })
})
