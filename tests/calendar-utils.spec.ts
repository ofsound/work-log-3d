import {
  buildDaySegmentLayouts,
  buildMonthGridDays,
  buildWeekDays,
  buildYearHeatmapMonths,
  duplicateTimeBoxToDay,
  formatDateKey,
  getBufferedCalendarRange,
  getDayRange,
  getIsoWeekNumber,
  getMonthGridRange,
  getStartOfWeek,
  getYearHeatmapIntensity,
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

  it('builds year heatmap months from current month back to the first month with logged time', () => {
    const months = buildYearHeatmapMonths(
      [
        {
          ...baseTimeBox,
          startTime: new Date(2023, 5, 15, 9, 0, 0, 0),
          endTime: new Date(2023, 5, 15, 11, 0, 0, 0),
        },
      ],
      new Date(2026, 2, 21, 12, 0, 0, 0),
    )

    expect(months).toHaveLength(34)
    expect(months[0]!.year).toBe(2026)
    expect(months[0]!.monthIndex).toBe(2)
    expect(months.at(-1)!.year).toBe(2023)
    expect(months.at(-1)!.monthIndex).toBe(5)
  })

  it('pads year heatmap months Monday-first and keeps leap day cells', () => {
    const months = buildYearHeatmapMonths(
      [
        {
          ...baseTimeBox,
          startTime: new Date(2024, 1, 29, 9, 0, 0, 0),
          endTime: new Date(2024, 1, 29, 11, 0, 0, 0),
        },
      ],
      new Date(2024, 2, 3, 12, 0, 0, 0),
    )
    const february = months.find((m) => m.year === 2024 && m.monthIndex === 1)

    expect(february).toBeDefined()
    expect(february!.weeks[0]!.slice(0, 3)).toEqual([null, null, null])
    expect(february!.weeks[0]![3]?.dateKey).toBe('2024-02-01')

    const leapDay = february!.weeks.flat().find((cell) => cell?.dateKey === '2024-02-29')

    expect(leapDay?.minutes).toBe(120)
  })

  it('splits overnight sessions into separate year heatmap day totals', () => {
    const months = buildYearHeatmapMonths(
      [
        {
          ...baseTimeBox,
          startTime: new Date(2024, 1, 29, 23, 0, 0, 0),
          endTime: new Date(2024, 2, 1, 2, 0, 0, 0),
        },
      ],
      new Date(2024, 2, 1, 12, 0, 0, 0),
    )
    const february = months.find((m) => m.year === 2024 && m.monthIndex === 1)!
    const march = months.find((m) => m.year === 2024 && m.monthIndex === 2)!
    const februaryLeapDay = february.weeks.flat().find((cell) => cell?.dateKey === '2024-02-29')
    const marchFirst = march.weeks.flat().find((cell) => cell?.dateKey === '2024-03-01')

    expect(februaryLeapDay?.minutes).toBe(60)
    expect(februaryLeapDay?.sessionCount).toBe(1)
    expect(marchFirst?.minutes).toBe(120)
    expect(marchFirst?.sessionCount).toBe(1)
  })

  it('maps fixed heatmap thresholds into five intensity levels', () => {
    expect(getYearHeatmapIntensity(0)).toBe(0)
    expect(getYearHeatmapIntensity(30)).toBe(1)
    expect(getYearHeatmapIntensity(120)).toBe(2)
    expect(getYearHeatmapIntensity(240)).toBe(3)
    expect(getYearHeatmapIntensity(360)).toBe(4)
    expect(getYearHeatmapIntensity(480)).toBe(5)
  })

  it('marks days outside the tracked window as inactive while keeping in-range zero days active', () => {
    const months = buildYearHeatmapMonths(
      [
        {
          ...baseTimeBox,
          startTime: new Date(2024, 2, 10, 9, 0, 0, 0),
          endTime: new Date(2024, 2, 10, 10, 0, 0, 0),
        },
      ],
      new Date(2024, 2, 12, 12, 0, 0, 0),
    )
    const march = months.find((m) => m.year === 2024 && m.monthIndex === 2)!
    const marchNinth = march.weeks.flat().find((cell) => cell?.dateKey === '2024-03-09')
    const marchEleventh = march.weeks.flat().find((cell) => cell?.dateKey === '2024-03-11')
    const marchThirteenth = march.weeks.flat().find((cell) => cell?.dateKey === '2024-03-13')

    expect(marchNinth?.inactive).toBe(true)
    expect(marchEleventh?.inactive).toBe(false)
    expect(marchEleventh?.intensity).toBe(0)
    expect(marchThirteenth?.inactive).toBe(true)
  })

  it('omits months after today and before the first logged month', () => {
    const months = buildYearHeatmapMonths(
      [
        {
          ...baseTimeBox,
          startTime: new Date(2024, 2, 10, 9, 0, 0, 0),
          endTime: new Date(2024, 2, 10, 10, 0, 0, 0),
        },
      ],
      new Date(2024, 2, 12, 12, 0, 0, 0),
    )

    expect(months.every((m) => m.year < 2024 || (m.year === 2024 && m.monthIndex <= 2))).toBe(true)
    expect(months.every((m) => m.year > 2024 || (m.year === 2024 && m.monthIndex >= 2))).toBe(true)
    expect(months.map((m) => `${m.year}-${m.monthIndex}`)).toEqual(['2024-2'])
  })

  it('returns only the current month when there are no timeboxes', () => {
    const months = buildYearHeatmapMonths([], new Date(2026, 2, 21, 12, 0, 0, 0))

    expect(months).toHaveLength(1)
    expect(months[0]!.year).toBe(2026)
    expect(months[0]!.monthIndex).toBe(2)
  })
})
