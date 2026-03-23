import { buildMonthGridDaySegments } from '~/app/utils/month-grid'

describe('month grid helper', () => {
  const baseTimeBox = {
    id: 'tb-1',
    startTime: new Date(2026, 2, 21, 9, 0, 0, 0),
    endTime: new Date(2026, 2, 21, 10, 0, 0, 0),
    notes: 'Focus block',
    project: 'project-1',
    tags: ['tag-1'],
  }

  it('returns month-grid days and groups segments by day key', () => {
    const monthGrid = buildMonthGridDaySegments([baseTimeBox], new Date(2026, 2, 21, 12, 0, 0, 0))
    const segments = monthGrid.segmentsByKey.get('2026-03-21')

    expect(monthGrid.gridDays).toHaveLength(42)
    expect(segments).toHaveLength(1)
    expect(segments?.[0]?.timeBox.id).toBe('tb-1')
  })

  it('splits overnight sessions across month-grid days and sorts by segment start time', () => {
    const overnightTimeBox = {
      ...baseTimeBox,
      id: 'tb-overnight',
      startTime: new Date(2026, 2, 21, 23, 30, 0, 0),
      endTime: new Date(2026, 2, 22, 1, 0, 0, 0),
    }
    const laterTimeBox = {
      ...baseTimeBox,
      id: 'tb-2',
      startTime: new Date(2026, 2, 21, 11, 0, 0, 0),
      endTime: new Date(2026, 2, 21, 12, 0, 0, 0),
    }

    const monthGrid = buildMonthGridDaySegments(
      [overnightTimeBox, laterTimeBox, baseTimeBox],
      new Date(2026, 2, 21, 12, 0, 0, 0),
    )

    expect(monthGrid.segmentsByKey.get('2026-03-21')?.map((segment) => segment.timeBox.id)).toEqual(
      ['tb-1', 'tb-2', 'tb-overnight'],
    )
    expect(monthGrid.segmentsByKey.get('2026-03-22')).toHaveLength(1)
  })
})
