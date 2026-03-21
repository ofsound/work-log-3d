import { getProjectPath, getTagPath } from '~/app/utils/worklog-routes'

describe('worklog routes', () => {
  it('builds stable ID-based project and tag routes', () => {
    expect(getProjectPath('project-123')).toBe('/project/project-123')
    expect(getTagPath('tag-123')).toBe('/tag/tag-123')
  })

  it('encodes IDs so route generation is deterministic', () => {
    expect(getProjectPath('project/123')).toBe('/project/project%2F123')
    expect(getTagPath('tag 123')).toBe('/tag/tag%20123')
  })
})
