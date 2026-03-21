export const LOGIN_ROUTE_PATH = '/login'
export const PUBLIC_REPORT_ROUTE_PREFIX = '/r/'

export const getLoginRedirectLocation = (path: string) => ({
  path: LOGIN_ROUTE_PATH,
  query: { redirect: path },
})

export const isPublicAnonymousPath = (path: string) =>
  path === LOGIN_ROUTE_PATH || path.startsWith(PUBLIC_REPORT_ROUTE_PREFIX)

export const getPostAuthRedirect = (redirect: unknown) => {
  return typeof redirect === 'string' ? redirect : '/'
}
