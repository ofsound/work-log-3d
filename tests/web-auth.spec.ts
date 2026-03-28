import {
  getLoginRedirectLocation,
  getPostAuthRedirect,
  isPublicAnonymousPath,
} from '~/app/utils/auth-navigation'

describe('web auth navigation', () => {
  it('keeps deep links intact while routing anonymous users to login', () => {
    expect(getLoginRedirectLocation('/sessions?view=recent')).toEqual({
      path: '/login',
      query: { redirect: '/sessions?view=recent' },
    })
  })

  it('returns a safe post-auth landing path', () => {
    expect(getPostAuthRedirect('/projects')).toBe('/projects')
    expect(getPostAuthRedirect(undefined)).toBe('/')
  })

  it('allows anonymous access to public report routes', () => {
    expect(isPublicAnonymousPath('/login')).toBe(true)
    expect(isPublicAnonymousPath('/r/public-token')).toBe(true)
    expect(isPublicAnonymousPath('/reports')).toBe(false)
  })
})
