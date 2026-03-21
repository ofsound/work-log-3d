import { formatDateKey, parseDateKey } from '~~/shared/worklog'

export const SESSION_VIEW_MODES = ['day', 'week', 'month', 'year', 'list'] as const

export type SessionsViewMode = (typeof SESSION_VIEW_MODES)[number]

export interface SessionsRouteState {
  mode: SessionsViewMode
  date: Date
}

const defaultMode: SessionsViewMode = 'day'

const isViewMode = (value: string): value is SessionsViewMode =>
  SESSION_VIEW_MODES.includes(value as SessionsViewMode)

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export const parseSessionsRouteState = (
  query: Record<string, string | string[] | undefined>,
  fallbackDate = new Date(),
): SessionsRouteState => {
  const modeValue = getSingleQueryValue(query.mode)
  const dateValue = getSingleQueryValue(query.date)

  return {
    mode: modeValue && isViewMode(modeValue) ? modeValue : defaultMode,
    date: parseDateKey(dateValue) ?? fallbackDate,
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

  return query
}
