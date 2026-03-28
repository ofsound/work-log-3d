import { defineNuxtRouteMiddleware, navigateTo } from '#app'

import { detectPhoneMode, getPhoneRedirectLocation } from '~/utils/phone-mode'

export default defineNuxtRouteMiddleware((to) => {
  if (typeof window === 'undefined') {
    return
  }

  if (!detectPhoneMode(window)) {
    return
  }

  const redirect = getPhoneRedirectLocation({
    path: to.path,
    params: to.params as Record<string, string | string[] | undefined>,
    query: to.query as Record<string, string | string[] | undefined>,
  })

  if (!redirect) {
    return
  }

  return navigateTo(redirect, { replace: true })
})
