export const LOGIN_ROUTE_PATH = '/login'

export const getLoginRedirectLocation = (path: string) => ({
  path: LOGIN_ROUTE_PATH,
  query: { redirect: path },
})

export const getPostAuthRedirect = (redirect: unknown) => {
  return typeof redirect === 'string' ? redirect : '/'
}
