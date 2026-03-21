export const getProjectPath = (projectId: string) => `/project/${encodeURIComponent(projectId)}`

export const getTagPath = (tagId: string) => `/tag/${encodeURIComponent(tagId)}`
