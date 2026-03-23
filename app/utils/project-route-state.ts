import { formatDateKey, parseDateKey } from '~~/shared/worklog'

export const PROJECT_VIEW_MODES = ['list', 'calendar'] as const

export type ProjectViewMode = (typeof PROJECT_VIEW_MODES)[number]

export interface ProjectRouteState {
  mode: ProjectViewMode
  date: Date
}

const defaultMode: ProjectViewMode = 'list'

const isViewMode = (value: string): value is ProjectViewMode =>
  PROJECT_VIEW_MODES.includes(value as ProjectViewMode)

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export const parseProjectRouteState = (
  query: Record<string, string | string[] | undefined>,
  fallbackDate = new Date(),
): ProjectRouteState => {
  const modeValue = getSingleQueryValue(query.mode)
  const dateValue = getSingleQueryValue(query.date)

  return {
    mode: modeValue && isViewMode(modeValue) ? modeValue : defaultMode,
    date: parseDateKey(dateValue) ?? fallbackDate,
  }
}

export const buildProjectRouteQuery = (
  state: ProjectRouteState,
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
