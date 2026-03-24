import { parseNewTimeBoxRoutePrefill } from '~/app/utils/new-timebox-route-state'

describe('new time box route prefill', () => {
  it('parses project and comma-separated tag ids from the query string', () => {
    expect(
      parseNewTimeBoxRoutePrefill({
        project: 'project-1',
        tags: 'tag-1,tag-2,tag-2',
      }),
    ).toEqual({
      project: 'project-1',
      tags: ['tag-1', 'tag-2'],
    })
  })

  it('filters out unknown ids when valid project and tag lists are provided', () => {
    expect(
      parseNewTimeBoxRoutePrefill(
        {
          project: 'missing-project',
          tags: 'tag-1,missing-tag,tag-2',
        },
        {
          validProjectIds: ['project-1'],
          validTagIds: ['tag-1'],
        },
      ),
    ).toEqual({
      project: '',
      tags: ['tag-1'],
    })
  })
})
