import { getProjectEditPath, getProjectPath } from '~/utils/worklog-routes'
import { formatDateKey, parseDateKey } from '~~/shared/worklog'

export const PROJECT_VIEW_MODES = ['list', 'calendar'] as const

export type ProjectViewMode = (typeof PROJECT_VIEW_MODES)[number]
export type ProjectWorkspaceMode = ProjectViewMode | 'edit'

export interface ProjectWorkspaceTab {
  id: ProjectWorkspaceMode
  label: string
}

export interface ProjectRouteState {
  mode: ProjectViewMode
  /** Calendar with no `date` query param; list mode always resolves to a concrete `Date`. */
  date: Date | null
  /** Inclusive end calendar day for multi-day sidebar (`dateEnd` query); null for single-day calendar selection. */
  dateEnd: Date | null
}

export type ProjectRouteQuery = Record<string, string | string[] | undefined>

export const PROJECT_WORKSPACE_TABS: readonly ProjectWorkspaceTab[] = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'edit', label: 'Edit' },
] as const

const defaultMode: ProjectViewMode = 'list'

const isViewMode = (value: string): value is ProjectViewMode =>
  PROJECT_VIEW_MODES.includes(value as ProjectViewMode)

const getSingleQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export const parseProjectRouteState = (
  query: ProjectRouteQuery,
  fallbackDate = new Date(),
): ProjectRouteState => {
  const modeValue = getSingleQueryValue(query.mode)
  const dateValue = getSingleQueryValue(query.date)
  const dateEndValue = getSingleQueryValue(query.dateEnd)
  const mode = modeValue && isViewMode(modeValue) ? modeValue : defaultMode
  const dateParsed = dateValue !== undefined ? parseDateKey(dateValue) : null
  const dateEndParsed = dateEndValue !== undefined ? parseDateKey(dateEndValue) : null

  let date: Date | null
  if (mode === 'calendar' && dateValue === undefined) {
    date = null
  } else if (dateParsed) {
    date = dateParsed
  } else {
    date = fallbackDate
  }

  let dateEnd: Date | null = null
  if (
    mode === 'calendar' &&
    date !== null &&
    dateEndParsed &&
    formatDateKey(dateEndParsed) !== formatDateKey(date)
  ) {
    const startKey = formatDateKey(date)
    const endKey = formatDateKey(dateEndParsed)
    if (startKey <= endKey) {
      dateEnd = dateEndParsed
    } else {
      const laterDay = date
      date = dateEndParsed
      dateEnd = laterDay
    }
  }

  return {
    mode,
    date,
    dateEnd,
  }
}

export const buildProjectRouteQuery = (
  state: ProjectRouteState,
  currentQuery: ProjectRouteQuery = {},
) => {
  const query = { ...currentQuery }

  if (state.mode === defaultMode) {
    delete query.mode
  } else {
    query.mode = state.mode
  }

  if (state.date === null) {
    delete query.date
  } else {
    query.date = formatDateKey(state.date)
  }

  if (
    state.dateEnd == null ||
    state.date === null ||
    formatDateKey(state.dateEnd) === formatDateKey(state.date)
  ) {
    delete query.dateEnd
  } else {
    query.dateEnd = formatDateKey(state.dateEnd)
  }

  return query
}

/** `pathSegment` is whatever appears in `/project/:id` (slug or document id). */
export const buildProjectWorkspaceLocation = (
  pathSegment: string,
  mode: ProjectWorkspaceMode,
  currentState: ProjectRouteState,
  currentQuery: ProjectRouteQuery = {},
) => {
  const state = {
    ...currentState,
    ...(mode === 'edit' ? {} : { mode }),
  }
  const query = buildProjectRouteQuery(state, currentQuery)

  return {
    path: mode === 'edit' ? getProjectEditPath(pathSegment) : getProjectPath(pathSegment),
    query,
  }
}
