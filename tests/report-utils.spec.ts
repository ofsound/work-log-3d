import {
  buildReportSnapshot,
  createDefaultReportInput,
  matchesReportFilter,
  validateReportInput,
} from '~~/shared/worklog'

import type { ReportFilter, TimeBox } from '~~/shared/worklog'

describe('report utilities', () => {
  const projects = [
    { id: 'project-a', name: 'Project A' },
    { id: 'project-b', name: 'Project B' },
  ]
  const tags = [
    { id: 'tag-plan', name: 'Planning' },
    { id: 'tag-build', name: 'Build' },
    { id: 'tag-review', name: 'Review' },
  ]
  const baseFilters: ReportFilter = {
    dateStart: '2026-03-01',
    dateEnd: '2026-03-31',
    projectIds: [],
    tagIds: [],
    groupOperator: 'intersection',
    tagOperator: 'any',
  }
  const sampleTimeBox: TimeBox = {
    id: 'tb-1',
    startTime: new Date('2026-03-10T16:00:00.000Z'),
    endTime: new Date('2026-03-10T17:30:00.000Z'),
    notes: 'Worked through deliverables',
    project: 'project-a',
    tags: ['tag-plan', 'tag-build'],
  }

  it('validates report inputs and trims persisted fields', () => {
    const report = validateReportInput({
      title: '  March Client Report  ',
      summary: '  Summary text  ',
      filters: {
        ...baseFilters,
        projectIds: [' project-a ', 'project-a'],
        tagIds: ['tag-plan', ' tag-build '],
      },
    })

    expect(report.title).toBe('March Client Report')
    expect(report.summary).toBe('Summary text')
    expect(report.filters.projectIds).toEqual(['project-a'])
    expect(report.filters.tagIds).toEqual(['tag-plan', 'tag-build'])
  })

  it('supports project/tag intersection, union, and tag any/all matching', () => {
    expect(
      matchesReportFilter(sampleTimeBox, {
        ...baseFilters,
        projectIds: ['project-a'],
        tagIds: ['tag-plan'],
        groupOperator: 'intersection',
        tagOperator: 'any',
      }),
    ).toBe(true)

    expect(
      matchesReportFilter(sampleTimeBox, {
        ...baseFilters,
        projectIds: ['project-b'],
        tagIds: ['tag-plan'],
        groupOperator: 'intersection',
        tagOperator: 'any',
      }),
    ).toBe(false)

    expect(
      matchesReportFilter(sampleTimeBox, {
        ...baseFilters,
        projectIds: ['project-b'],
        tagIds: ['tag-plan'],
        groupOperator: 'union',
        tagOperator: 'any',
      }),
    ).toBe(true)

    expect(
      matchesReportFilter(sampleTimeBox, {
        ...baseFilters,
        tagIds: ['tag-plan', 'tag-review'],
        tagOperator: 'all',
      }),
    ).toBe(false)

    expect(
      matchesReportFilter(sampleTimeBox, {
        ...baseFilters,
        tagIds: ['tag-plan', 'tag-build'],
        tagOperator: 'all',
      }),
    ).toBe(true)
  })

  it('clamps report totals to the UTC date range and splits sessions across UTC midnights', () => {
    const snapshot = buildReportSnapshot({
      filters: {
        ...baseFilters,
        dateStart: '2026-03-01',
        dateEnd: '2026-03-02',
      },
      projects,
      tags,
      timeBoxes: [
        {
          id: 'tb-overnight',
          startTime: new Date('2026-03-01T22:00:00.000Z'),
          endTime: new Date('2026-03-02T02:00:00.000Z'),
          notes: 'Crosses UTC midnight',
          project: 'project-a',
          tags: ['tag-plan'],
        },
        {
          id: 'tb-day2',
          startTime: new Date('2026-03-02T10:00:00.000Z'),
          endTime: new Date('2026-03-02T11:00:00.000Z'),
          notes: 'Morning work',
          project: 'project-b',
          tags: ['tag-review'],
        },
      ],
    })

    expect(snapshot.overview.totalMinutes).toBe(300)
    expect(snapshot.overview.activeDayCount).toBe(2)
    expect(snapshot.dailyRollups.map((rollup) => [rollup.dateKey, rollup.minutes])).toEqual([
      ['2026-03-01', 120],
      ['2026-03-02', 180],
    ])
    expect(snapshot.overview.busiestDayDateKey).toBe('2026-03-02')
    expect(snapshot.sessionGroups[0]?.dateKey).toBe('2026-03-02')
    expect(snapshot.sessionGroups[1]?.dateKey).toBe('2026-03-01')
  })

  it('builds project and tag breakdowns, matrix totals, and context-switch insights', () => {
    const snapshot = buildReportSnapshot({
      filters: baseFilters,
      projects,
      tags,
      timeBoxes: [
        sampleTimeBox,
        {
          id: 'tb-2',
          startTime: new Date('2026-03-10T18:00:00.000Z'),
          endTime: new Date('2026-03-10T19:00:00.000Z'),
          notes: 'Review pass',
          project: 'project-b',
          tags: ['tag-review'],
        },
      ],
    })

    expect(snapshot.projectBreakdown.map((item) => [item.id, item.minutes])).toEqual([
      ['project-a', 90],
      ['project-b', 60],
    ])
    expect(snapshot.tagBreakdown.map((item) => [item.id, item.minutes])).toEqual([
      ['tag-review', 60],
      ['tag-build', 45],
      ['tag-plan', 45],
    ])
    expect(snapshot.projectTagMatrix.rows[0]?.cells.map((cell) => cell.minutes)).toContain(45)
    expect(snapshot.overview.contextSwitchCount).toBe(1)
    expect(snapshot.insights.some((insight) => insight.id === 'top-project')).toBe(true)
  })

  it('creates month-to-date defaults using UTC calendar dates', () => {
    const report = createDefaultReportInput(new Date('2026-03-21T16:00:00.000Z'))

    expect(report.title).toBe('Client Report')
    expect(report.filters.dateStart).toBe('2026-03-01')
    expect(report.filters.dateEnd).toBe('2026-03-21')
  })
})
