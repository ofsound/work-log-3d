import type { Project, Tag } from '~~/shared/worklog'

export const getProjectPath = (segment: string) => `/project/${encodeURIComponent(segment)}`

export const getProjectEditPath = (segment: string) =>
  `/project/${encodeURIComponent(segment)}/edit`

export const getTagPath = (segment: string) => `/tag/${encodeURIComponent(segment)}`

export const projectUrlSegment = (project: Pick<Project, 'id' | 'slug'>) =>
  project.slug || project.id

export const tagUrlSegment = (tag: Pick<Tag, 'id' | 'slug'>) => tag.slug || tag.id

export const getProjectPathFromProject = (project: Pick<Project, 'id' | 'slug'>) =>
  getProjectPath(projectUrlSegment(project))

export const getProjectEditPathFromProject = (project: Pick<Project, 'id' | 'slug'>) =>
  getProjectEditPath(projectUrlSegment(project))

export const getTagPathFromTag = (tag: Pick<Tag, 'id' | 'slug'>) => getTagPath(tagUrlSegment(tag))

export const getPublicReportPath = (token: string) => `/r/${encodeURIComponent(token)}`
