export const shouldRedirectToLogin = ({
  currentUser,
  previousUser,
  routePath,
}: {
  currentUser: unknown
  previousUser: unknown
  routePath: string
}) => {
  return Boolean(previousUser) && !currentUser && routePath !== '/login'
}

export const getPostAuthRedirect = (redirect: unknown) => {
  return typeof redirect === 'string' ? redirect : '/'
}
