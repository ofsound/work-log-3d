import type { Project } from '~~/shared/worklog'

export const getProjectNewPath = () => '/project/new'

export const getProjectPath = (segment: string) => `/project/${encodeURIComponent(segment)}`

export const getProjectEditPath = (segment: string) =>
  `/project/${encodeURIComponent(segment)}/edit`

export const projectUrlSegment = (project: Pick<Project, 'id' | 'slug'>) =>
  project.slug || project.id

export const getProjectPathFromProject = (project: Pick<Project, 'id' | 'slug'>) =>
  getProjectPath(projectUrlSegment(project))

export const getProjectEditPathFromProject = (project: Pick<Project, 'id' | 'slug'>) =>
  getProjectEditPath(projectUrlSegment(project))

export const getPublicReportPath = (token: string) => `/r/${encodeURIComponent(token)}`
