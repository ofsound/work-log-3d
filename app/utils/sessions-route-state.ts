import type { RouteLocationRaw } from 'vue-router'

import {
  createDefaultSessionListFilters,
  formatDateKey,
  normalizeSessionListFilters,
  parseDateKey,
  type SessionListFilters,
  type SessionListSort,
  type SessionNotesState,
  type SessionTagMatchMode,
} from '~~/shared/worklog'

export const SESSION_VIEW_MODES = ['day', 'week', 'month', 'year', 'search'] as const

export type SessionsViewMode = (typeof SESSION_VIEW_MODES)[number]

/** Legacy query value; parsed as {@link SessionsViewMode} `'search'`. */
const LEGACY_SESSIONS_VIEW_MODE_LIST = 'list' as const

export interface SessionsRouteState {
  mode: SessionsViewMode
  date: Date
  listFilters: SessionListFilters
}

const defaultMode: SessionsViewMode = 'day'
const defaultListFilters = createDefaultSessionListFilters()

const isViewMode = (value: string): value is SessionsViewMode =>
  SESSION_VIEW_MODES.includes(value as SessionsViewMode)

const parseModeFromQuery = (modeValue: string | undefined): SessionsViewMode => {
  if (!modeValue) {
    return defaultMode
  }

  if (modeValue === LEGACY_SESSIONS_VIEW_MODE_LIST) {
    return 'search'
  }

  if (isViewMode(modeValue)) {
    return modeValue
  }

  return defaultMode
}

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

const getListQueryIds = (value: string | string[] | undefined) =>
  (getSingleQueryValue(value) ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const getListQueryNumber = (value: string | string[] | undefined) => {
  const normalized = getSingleQueryValue(value)?.trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

const getListQueryBoolean = (value: string | string[] | undefined) => {
  const normalized = getSingleQueryValue(value)?.trim().toLowerCase()

  return normalized === '1' || normalized === 'true'
}

export const parseSessionsRouteState = (
  query: Record<string, string | string[] | undefined>,
  fallbackDate = new Date(),
): SessionsRouteState => {
  const modeValue = getSingleQueryValue(query.mode)
  const dateValue = getSingleQueryValue(query.date)

  return {
    mode: parseModeFromQuery(modeValue),
    date: parseDateKey(dateValue) ?? fallbackDate,
    listFilters: normalizeSessionListFilters({
      query: getSingleQueryValue(query.q) ?? '',
      projectIds: getListQueryIds(query.projects),
      tagIds: getListQueryIds(query.tags),
      tagMode:
        (getSingleQueryValue(query.tagMode) as SessionTagMatchMode | undefined) ??
        defaultListFilters.tagMode,
      dateStart: getSingleQueryValue(query.from) ?? '',
      dateEnd: getSingleQueryValue(query.to) ?? '',
      minMinutes: getListQueryNumber(query.min),
      maxMinutes: getListQueryNumber(query.max),
      untaggedOnly: getListQueryBoolean(query.untagged),
      notesState:
        (getSingleQueryValue(query.notes) as SessionNotesState | undefined) ??
        defaultListFilters.notesState,
      sort:
        (getSingleQueryValue(query.sort) as SessionListSort | undefined) ?? defaultListFilters.sort,
    }),
  }
}

export const buildSessionsRouteQuery = (
  state: SessionsRouteState,
  currentQuery: Record<string, string | string[] | undefined> = {},
) => {
  const query = { ...currentQuery }

  if (state.mode === defaultMode) {
    delete query.mode
  } else {
    query.mode = state.mode
  }

  query.date = formatDateKey(state.date)

  if (state.mode !== 'search') {
    delete query.q
    delete query.projects
    delete query.tags
    delete query.tagMode
    delete query.from
    delete query.to
    delete query.min
    delete query.max
    delete query.untagged
    delete query.notes
    delete query.sort
  } else {
    const filters = normalizeSessionListFilters(state.listFilters)

    if (filters.query) {
      query.q = filters.query
    } else {
      delete query.q
    }

    if (filters.projectIds.length > 0) {
      query.projects = filters.projectIds.join(',')
    } else {
      delete query.projects
    }

    if (filters.tagIds.length > 0) {
      query.tags = filters.tagIds.join(',')
    } else {
      delete query.tags
    }

    if (filters.tagMode !== defaultListFilters.tagMode) {
      query.tagMode = filters.tagMode
    } else {
      delete query.tagMode
    }

    if (filters.dateStart) {
      query.from = filters.dateStart
    } else {
      delete query.from
    }

    if (filters.dateEnd) {
      query.to = filters.dateEnd
    } else {
      delete query.to
    }

    if (filters.minMinutes !== null) {
      query.min = String(filters.minMinutes)
    } else {
      delete query.min
    }

    if (filters.maxMinutes !== null) {
      query.max = String(filters.maxMinutes)
    } else {
      delete query.max
    }

    if (filters.untaggedOnly) {
      query.untagged = '1'
    } else {
      delete query.untagged
    }

    if (filters.notesState !== defaultListFilters.notesState) {
      query.notes = filters.notesState
    } else {
      delete query.notes
    }

    query.sort = filters.sort
  }

  return query
}

/** Sessions search with a single tag filter; pass `{}` as the merge base in {@link buildSessionsRouteQuery}. */
export const getSessionsSearchRouteForTag = (
  tagId: string,
  anchorDate: Date = new Date(),
): RouteLocationRaw => ({
  path: '/sessions',
  query: buildSessionsRouteQuery(
    {
      mode: 'search',
      date: anchorDate,
      listFilters: normalizeSessionListFilters({
        ...createDefaultSessionListFilters(),
        tagIds: [tagId],
      }),
    },
    {},
  ),
})
