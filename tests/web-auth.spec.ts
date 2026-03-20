import { getPostAuthRedirect, shouldRedirectToLogin } from '~/app/utils/auth-navigation'

describe('web auth navigation', () => {
  it('keeps redirect logic deterministic for login/logout flows', () => {
    expect(
      shouldRedirectToLogin({
        currentUser: null,
        previousUser: { uid: '1' },
        routePath: '/sessions',
      }),
    ).toBe(true)

    expect(getPostAuthRedirect('/projects')).toBe('/projects')
    expect(getPostAuthRedirect(undefined)).toBe('/')
  })
})
