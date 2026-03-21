import { getLoginRedirectLocation, LOGIN_ROUTE_PATH } from '~/utils/auth-navigation'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === LOGIN_ROUTE_PATH) return

  const user = await getCurrentUser()
  if (!user) {
    return navigateTo(getLoginRedirectLocation(to.fullPath))
  }
})
