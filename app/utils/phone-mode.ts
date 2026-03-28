import type { RouteLocationRaw } from 'vue-router'

import { buildSessionsRouteQuery, parseSessionsRouteState } from '~/utils/sessions-route-state'

export const PHONE_MODE_MAX_WIDTH_PX = 767
export const PHONE_MODE_VIEWPORT_QUERY = `(max-width: ${PHONE_MODE_MAX_WIDTH_PX}px)`
export const PHONE_MODE_TOUCH_QUERY = '(hover: none) and (pointer: coarse)'

export const PHONE_MODE_SUPPORTED_SESSIONS_VIEW_MODES = ['day', 'search'] as const

interface MatchMediaWindow {
  matchMedia: (query: string) => {
    matches: boolean
  }
}

export interface PhoneAwareRouteLike {
  path: string
  params?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

const isSupportedPhoneSessionsMode = (value: string) =>
  PHONE_MODE_SUPPORTED_SESSIONS_VIEW_MODES.includes(
    value as (typeof PHONE_MODE_SUPPORTED_SESSIONS_VIEW_MODES)[number],
  )

const isProjectOverviewPath = (path: string) => /^\/project\/[^/]+$/.test(path)

const isProjectEditPath = (path: string) => /^\/project\/[^/]+\/edit$/.test(path)

const getProjectPathSegment = (route: PhoneAwareRouteLike) => {
  const fromParams = route.params?.id
  const paramValue = Array.isArray(fromParams) ? fromParams[0] : fromParams

  if (typeof paramValue === 'string' && paramValue.length > 0) {
    return paramValue
  }

  const [, , segment = ''] = route.path.split('/')
  return segment
}

export const detectPhoneMode = (windowObject: MatchMediaWindow) =>
  windowObject.matchMedia(PHONE_MODE_VIEWPORT_QUERY).matches &&
  windowObject.matchMedia(PHONE_MODE_TOUCH_QUERY).matches

export const routeRequiresPhoneResolution = (route: PhoneAwareRouteLike) => {
  if (route.path === '/reports') {
    return true
  }

  if (isProjectEditPath(route.path)) {
    return true
  }

  if (route.path === '/sessions') {
    const mode = parseSessionsRouteState(route.query ?? {}).mode
    return !isSupportedPhoneSessionsMode(mode)
  }

  if (isProjectOverviewPath(route.path)) {
    return (route.query?.mode as string | undefined) === 'calendar'
  }

  return false
}

export const getPhoneRedirectLocation = (route: PhoneAwareRouteLike): RouteLocationRaw | null => {
  if (route.path === '/reports') {
    return { path: '/sessions' }
  }

  if (route.path === '/sessions') {
    const state = parseSessionsRouteState(route.query ?? {})

    if (isSupportedPhoneSessionsMode(state.mode)) {
      return null
    }

    return {
      path: '/sessions',
      query: buildSessionsRouteQuery(
        {
          ...state,
          mode: 'day',
        },
        route.query ?? {},
      ),
    }
  }

  if (isProjectEditPath(route.path)) {
    const segment = getProjectPathSegment(route)
    const nextQuery = { ...(route.query ?? {}) }
    delete nextQuery.mode

    return {
      path: `/project/${encodeURIComponent(segment)}`,
      query: nextQuery,
    }
  }

  if (
    isProjectOverviewPath(route.path) &&
    (route.query?.mode as string | undefined) === 'calendar'
  ) {
    const nextQuery = { ...(route.query ?? {}) }
    delete nextQuery.mode

    return {
      path: route.path,
      query: nextQuery,
    }
  }

  return null
}
