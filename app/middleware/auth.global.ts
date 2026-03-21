import { getLoginRedirectLocation, isPublicAnonymousPath } from '~/utils/auth-navigation'

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicAnonymousPath(to.path)) return

  const user = await getCurrentUser()
  if (!user) {
    return navigateTo(getLoginRedirectLocation(to.fullPath))
  }
})
