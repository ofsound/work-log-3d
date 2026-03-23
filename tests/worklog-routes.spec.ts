import {
  getProjectEditPath,
  getProjectEditPathFromProject,
  getProjectNewPath,
  getProjectPath,
  getProjectPathFromProject,
  getPublicReportPath,
  getTagPath,
  getTagPathFromTag,
  projectUrlSegment,
  tagUrlSegment,
} from '~/app/utils/worklog-routes'

describe('worklog routes', () => {
  it('builds project and tag routes from URL segments', () => {
    expect(getProjectNewPath()).toBe('/project/new')
    expect(getProjectPath('my-project')).toBe('/project/my-project')
    expect(getProjectEditPath('my-project')).toBe('/project/my-project/edit')
    expect(getTagPath('focus')).toBe('/tag/focus')
  })

  it('prefers slug over id for entity-based helpers', () => {
    expect(
      getProjectPathFromProject({
        id: 'proj-1',
        slug: 'client-work',
        name: '',
        notes: '',
        colors: { primary: '#000', secondary: null },
      }),
    ).toBe('/project/client-work')
    expect(
      getProjectEditPathFromProject({
        id: 'proj-1',
        slug: 'client-work',
        name: '',
        notes: '',
        colors: { primary: '#000', secondary: null },
      }),
    ).toBe('/project/client-work/edit')
    expect(getTagPathFromTag({ id: 'tag-1', slug: 'deep-work' })).toBe('/tag/deep-work')
  })

  it('falls back to id when slug is empty', () => {
    expect(projectUrlSegment({ id: 'proj-1', slug: '' })).toBe('proj-1')
    expect(tagUrlSegment({ id: 'tag-1', slug: '' })).toBe('tag-1')
    expect(
      getProjectPathFromProject({
        id: 'proj-1',
        slug: '',
        name: '',
        notes: '',
        colors: { primary: '#000', secondary: null },
      }),
    ).toBe('/project/proj-1')
  })

  it('encodes segments so route generation is deterministic', () => {
    expect(getProjectPath('project/123')).toBe('/project/project%2F123')
    expect(getProjectEditPath('project/123')).toBe('/project/project%2F123/edit')
    expect(getTagPath('tag 123')).toBe('/tag/tag%20123')
    expect(getPublicReportPath('report token')).toBe('/r/report%20token')
  })
})
