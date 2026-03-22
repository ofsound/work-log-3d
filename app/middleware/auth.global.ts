import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { getCurrentUser } from '#imports'

import { getLoginRedirectLocation, isPublicAnonymousPath } from '~/utils/auth-navigation'

export default defineNuxtRouteMiddleware(async (to) => {
  if (isPublicAnonymousPath(to.path)) return

  if (typeof window === 'undefined') return

  const user = await getCurrentUser()
  if (!user) {
    return navigateTo(getLoginRedirectLocation(to.fullPath))
  }
})
