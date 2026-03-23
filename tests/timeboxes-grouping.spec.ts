import { groupTimeBoxesByStartDay } from '~~/shared/worklog'

describe('groupTimeBoxesByStartDay', () => {
  it('sorts sessions within the same day chronologically when input is newest-first', () => {
    const day = new Date(2026, 2, 23, 0, 0, 0, 0)
    const evening = new Date(day)
    evening.setHours(18, 0, 0, 0)
    const noon = new Date(day)
    noon.setHours(12, 0, 0, 0)
    const morning = new Date(day)
    morning.setHours(9, 0, 0, 0)

    const mk = (id: string, start: Date) => ({
      id,
      startTime: start,
      endTime: new Date(start.valueOf() + 60 * 60 * 1000),
      notes: '',
      project: 'p1',
      tags: [] as string[],
    })

    const input = [mk('c', evening), mk('b', noon), mk('a', morning)]
    const groups = groupTimeBoxesByStartDay(input)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.map((tb) => tb.id)).toEqual(['a', 'b', 'c'])
  })
})
