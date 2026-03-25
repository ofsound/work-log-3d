export const PROJECTS_PAGE_LAYOUTS = ['list', 'grid'] as const

export type ProjectsPageLayout = (typeof PROJECTS_PAGE_LAYOUTS)[number]

export const PROJECTS_LAYOUT_GUEST_STORAGE_KEY = 'work-log-projects-layout:guest'
export const PROJECTS_LAYOUT_USER_STORAGE_KEY_PREFIX = 'work-log-projects-layout:user:'

export const DEFAULT_PROJECTS_PAGE_LAYOUT: ProjectsPageLayout = 'grid'

export interface ProjectsLayoutStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const isProjectsPageLayout = (
  value: string | null | undefined,
): value is ProjectsPageLayout =>
  value != null && PROJECTS_PAGE_LAYOUTS.includes(value as ProjectsPageLayout)

/** Normalize `?view=` from `useRoute().query` (accepts vue-router value shapes). */
export const coerceProjectsPageViewQuery = (raw: unknown): ProjectsPageLayout => {
  const value = Array.isArray(raw) ? raw[0] : raw

  return typeof value === 'string' && isProjectsPageLayout(value) ? value : DEFAULT_PROJECTS_PAGE_LAYOUT
}

export const getProjectsLayoutStorageKey = (userId: string | null) =>
  userId ? `${PROJECTS_LAYOUT_USER_STORAGE_KEY_PREFIX}${userId}` : PROJECTS_LAYOUT_GUEST_STORAGE_KEY

export const readProjectsPageLayout = (
  storage: ProjectsLayoutStorageLike,
  key: string,
): ProjectsPageLayout | null => {
  const stored = storage.getItem(key)

  return isProjectsPageLayout(stored) ? stored : null
}

export const writeProjectsPageLayout = (
  storage: ProjectsLayoutStorageLike,
  key: string,
  layout: ProjectsPageLayout,
) => {
  storage.setItem(key, layout)
}
