export const getProjectPath = (projectId: string) => `/project/${encodeURIComponent(projectId)}`

export const getTagPath = (tagId: string) => `/tag/${encodeURIComponent(tagId)}`

export const getPublicReportPath = (token: string) => `/r/${encodeURIComponent(token)}`
