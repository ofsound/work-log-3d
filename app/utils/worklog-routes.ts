export const getProjectPath = (projectId: string) => `/project/${encodeURIComponent(projectId)}`

export const getProjectEditPath = (projectId: string) =>
  `/project/${encodeURIComponent(projectId)}/edit`

export const getTagPath = (tagId: string) => `/tag/${encodeURIComponent(tagId)}`

export const getPublicReportPath = (token: string) => `/r/${encodeURIComponent(token)}`
