import type { ComputedRef } from 'vue'

import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  buildSessionsRouteQuery,
  parseSessionsRouteState,
  type SessionsRouteState,
  type SessionsViewMode,
} from '~/utils/sessions-route-state'
import type { SessionListFilters } from '~~/shared/worklog'
import {
  addDays,
  addMonths,
  createDefaultSessionListFilters,
  normalizeSessionListFilters,
  getEndOfWeek,
  getStartOfWeek,
} from '~~/shared/worklog'

type RouteQuery = Record<string, string | string[] | undefined>

export interface SessionsRouteUpdateOptions {
  history?: 'push' | 'replace'
}

export interface SessionsYearHeatmapMonth {
  year: number
}

export interface UseSessionsRouteStateOptions {
  clearError?: () => void
  yearHeatmapMonths?: ComputedRef<SessionsYearHeatmapMonth[]>
}

const hasSameQueryState = (left: RouteQuery, right: RouteQuery) => {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) {
      return false
    }

    const leftValue = left[key]
    const rightValue = right[key]

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return JSON.stringify(leftValue) === JSON.stringify(rightValue)
    }

    return leftValue === rightValue
  })
}

export function useSessionsRouteState(options: UseSessionsRouteStateOptions = {}) {
  const route = useRoute()
  const router = useRouter()

  const routeState = computed(() =>
    parseSessionsRouteState(route.query as Record<string, string | string[] | undefined>),
  )
  const currentMode = computed(() => routeState.value.mode)
  const anchorDate = computed(() => routeState.value.date)
  const listFilters = computed(() => routeState.value.listFilters)

  const weekTitle = computed(() => {
    const start = getStartOfWeek(anchorDate.value)
    const end = addDays(getEndOfWeek(anchorDate.value), -1)

    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).formatRange(start, end)
  })

  const yearTitle = computed(() => {
    const latestYear = options.yearHeatmapMonths?.value[0]?.year
    const earliestYear = options.yearHeatmapMonths?.value.at(-1)?.year

    if (!latestYear || !earliestYear || latestYear === earliestYear) {
      return String(latestYear ?? new Date().getFullYear())
    }

    return `${earliestYear}-${latestYear}`
  })

  const pageTitle = computed(() => {
    if (currentMode.value === 'day') {
      return anchorDate.value.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }

    if (currentMode.value === 'week') {
      return weekTitle.value
    }

    if (currentMode.value === 'month') {
      return anchorDate.value.toLocaleDateString([], {
        month: 'long',
        year: 'numeric',
      })
    }

    if (currentMode.value === 'year') {
      return yearTitle.value
    }

    return 'Sessions'
  })

  const updateRouteState = async (
    nextState: Partial<SessionsRouteState>,
    routeOptions: SessionsRouteUpdateOptions = {},
  ) => {
    options.clearError?.()

    const nextQuery = buildSessionsRouteQuery(
      {
        ...routeState.value,
        ...nextState,
      },
      route.query as RouteQuery,
    )
    const currentQuery = route.query as RouteQuery

    if (hasSameQueryState(currentQuery, nextQuery)) {
      return
    }

    const navigate = routeOptions.history === 'push' ? router.push : router.replace

    await navigate({
      query: nextQuery,
    })
  }

  const updateListFilters = async (nextFilters: Partial<SessionListFilters>) => {
    await updateRouteState({
      listFilters: normalizeSessionListFilters({
        ...listFilters.value,
        ...nextFilters,
      }),
    })
  }

  const clearListFilters = async () => {
    await updateRouteState({
      listFilters: normalizeSessionListFilters({
        ...createDefaultSessionListFilters(),
        sort: listFilters.value.sort,
      }),
    })
  }

  const changeMode = async (mode: SessionsViewMode) => {
    if (mode === currentMode.value) {
      return
    }

    if (mode === 'search') {
      await updateRouteState(
        {
          mode,
          listFilters: createDefaultSessionListFilters(),
        },
        { history: 'push' },
      )
      return
    }

    await updateRouteState({ mode }, { history: 'push' })
  }

  const navigatePeriod = async (direction: -1 | 1) => {
    if (currentMode.value === 'day') {
      await updateRouteState({ date: addDays(anchorDate.value, direction) })
      return
    }

    if (currentMode.value === 'week') {
      await updateRouteState({ date: addDays(anchorDate.value, direction * 7) })
      return
    }

    await updateRouteState({ date: addMonths(anchorDate.value, direction) })
  }

  const goToday = async () => {
    await updateRouteState({ date: new Date() })
  }

  return {
    anchorDate,
    changeMode,
    clearListFilters,
    currentMode,
    goToday,
    listFilters,
    navigatePeriod,
    pageTitle,
    routeState,
    updateListFilters,
    updateRouteState,
    weekTitle,
    yearTitle,
  }
}
