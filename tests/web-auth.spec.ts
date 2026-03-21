import {
  getLoginRedirectLocation,
  getPostAuthRedirect,
  LOGIN_ROUTE_PATH,
} from '~/app/utils/auth-navigation'

describe('web auth navigation', () => {
  it('keeps deep links intact while routing anonymous users to login', () => {
    expect(LOGIN_ROUTE_PATH).toBe('/login')
    expect(getLoginRedirectLocation('/sessions?view=recent')).toEqual({
      path: '/login',
      query: { redirect: '/sessions?view=recent' },
    })
  })

  it('returns a safe post-auth landing path', () => {
    expect(getPostAuthRedirect('/projects')).toBe('/projects')
    expect(getPostAuthRedirect(undefined)).toBe('/')
  })
})
