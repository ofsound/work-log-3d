import {
  buildDaySegmentLayouts,
  buildMonthGridDays,
  buildWeekDays,
  duplicateTimeBoxToDay,
  formatDateKey,
  getBufferedCalendarRange,
  getDayRange,
  getIsoWeekNumber,
  getMonthGridRange,
  getStartOfWeek,
  moveTimeBoxToStart,
  resizeTimeBoxEnd,
  resizeTimeBoxStart,
  splitTimeBoxIntoDaySegments,
} from '~~/shared/worklog'

describe('calendar utilities', () => {
  const baseTimeBox = {
    id: 'tb-1',
    startTime: new Date(2026, 2, 21, 9, 0, 0, 0),
    endTime: new Date(2026, 2, 21, 10, 0, 0, 0),
    notes: 'Focus block',
    project: 'project-1',
    tags: ['tag-1'],
  }

  it('builds Monday-first week and month grids', () => {
    const anchorDate = new Date(2026, 2, 21, 12, 0, 0, 0)
    const weekDays = buildWeekDays(anchorDate)
    const monthDays = buildMonthGridDays(anchorDate)

    expect(formatDateKey(getStartOfWeek(anchorDate))).toBe('2026-03-16')
    expect(formatDateKey(weekDays[0]!)).toBe('2026-03-16')
    expect(formatDateKey(weekDays.at(-1)!)).toBe('2026-03-22')
    expect(formatDateKey(monthDays[0]!)).toBe('2026-02-23')
    expect(monthDays).toHaveLength(42)
  })

  it('computes ISO week numbers and buffered query ranges', () => {
    expect(getIsoWeekNumber(new Date(2026, 2, 21, 12, 0, 0, 0))).toBe(12)

    const dayRange = getDayRange(new Date(2026, 2, 21, 12, 0, 0, 0))
    const bufferedDayRange = getBufferedCalendarRange('day', new Date(2026, 2, 21, 12, 0, 0, 0))
    const weekRange = getBufferedCalendarRange('week', new Date(2026, 2, 21, 12, 0, 0, 0))
    const monthRange = getBufferedCalendarRange('month', new Date(2026, 2, 21, 12, 0, 0, 0))
    const visibleMonthRange = getMonthGridRange(new Date(2026, 2, 21, 12, 0, 0, 0))

    expect(formatDateKey(dayRange.start)).toBe('2026-03-21')
    expect(formatDateKey(dayRange.end)).toBe('2026-03-22')
    expect(formatDateKey(bufferedDayRange.start)).toBe('2026-03-20')
    expect(formatDateKey(bufferedDayRange.end)).toBe('2026-03-23')
    expect(formatDateKey(weekRange.start)).toBe('2026-03-09')
    expect(formatDateKey(weekRange.end)).toBe('2026-03-30')
    expect(monthRange.start.valueOf()).toBeLessThan(visibleMonthRange.start.valueOf())
    expect(monthRange.end.valueOf()).toBeGreaterThan(visibleMonthRange.end.valueOf())
  })

  it('splits overnight timeboxes into day segments and lays out overlaps in lanes', () => {
    const overnightTimeBox = {
      ...baseTimeBox,
      id: 'tb-overnight',
      startTime: new Date(2026, 2, 21, 23, 30, 0, 0),
      endTime: new Date(2026, 2, 22, 1, 0, 0, 0),
    }
    const overlappingTimeBox = {
      ...baseTimeBox,
      id: 'tb-2',
      startTime: new Date(2026, 2, 21, 9, 15, 0, 0),
      endTime: new Date(2026, 2, 21, 10, 30, 0, 0),
    }

    const segments = splitTimeBoxIntoDaySegments(overnightTimeBox, {
      start: new Date(2026, 2, 21, 0, 0, 0, 0),
      end: new Date(2026, 2, 23, 0, 0, 0, 0),
    })
    const layouts = buildDaySegmentLayouts(
      splitTimeBoxIntoDaySegments(baseTimeBox, {
        start: new Date(2026, 2, 21, 0, 0, 0, 0),
        end: new Date(2026, 2, 22, 0, 0, 0, 0),
      }).concat(
        splitTimeBoxIntoDaySegments(overlappingTimeBox, {
          start: new Date(2026, 2, 21, 0, 0, 0, 0),
          end: new Date(2026, 2, 22, 0, 0, 0, 0),
        }),
      ),
    )

    expect(segments).toHaveLength(2)
    expect(formatDateKey(segments[0]!.dayStart)).toBe('2026-03-21')
    expect(formatDateKey(segments[1]!.dayStart)).toBe('2026-03-22')
    expect(layouts[0]!.laneCount).toBe(2)
    expect(layouts[1]!.laneCount).toBe(2)
    expect(new Set(layouts.map((layout) => layout.lane))).toEqual(new Set([0, 1]))
  })

  it('builds drag/drop payloads for move, duplicate, and resize operations', () => {
    const moved = moveTimeBoxToStart(baseTimeBox, new Date(2026, 2, 22, 13, 20, 0, 0))
    const duplicated = duplicateTimeBoxToDay(baseTimeBox, new Date(2026, 2, 24, 12, 0, 0, 0))
    const resizedStart = resizeTimeBoxStart(baseTimeBox, new Date(2026, 2, 21, 8, 40, 0, 0))
    const resizedEnd = resizeTimeBoxEnd(baseTimeBox, new Date(2026, 2, 21, 10, 40, 0, 0))

    expect(formatDateKey(moved.startTime)).toBe('2026-03-22')
    expect(moved.startTime.getHours()).toBe(13)
    expect(moved.endTime.getHours()).toBe(14)
    expect(formatDateKey(duplicated.startTime)).toBe('2026-03-24')
    expect(duplicated.startTime.getHours()).toBe(9)
    expect(duplicated.endTime.getHours()).toBe(10)
    expect(resizedStart.startTime.getMinutes()).toBe(40)
    expect(resizedEnd.endTime.getMinutes()).toBe(40)
  })
})
