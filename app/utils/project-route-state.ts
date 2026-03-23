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
  date: Date
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

  return {
    mode: modeValue && isViewMode(modeValue) ? modeValue : defaultMode,
    date: parseDateKey(dateValue) ?? fallbackDate,
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

  query.date = formatDateKey(state.date)

  return query
}

export const buildProjectWorkspaceLocation = (
  projectId: string,
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
    path: mode === 'edit' ? getProjectEditPath(projectId) : getProjectPath(projectId),
    query,
  }
}
