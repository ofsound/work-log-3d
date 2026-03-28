import {
  getPublishedReportByToken,
  publishReportDraft,
  unpublishReportDraft,
} from '~/server/utils/public-reports'

import type { PublishDraftDependencies, PublicReportError } from '~/server/utils/public-reports'

const createDependencies = (): PublishDraftDependencies => ({
  getReport: vi.fn(),
  getProjects: vi.fn(),
  getTags: vi.fn(),
  getTimeBoxes: vi.fn(),
  savePublishedReport: vi.fn(),
  updateReportPublishState: vi.fn(),
  deletePublishedReport: vi.fn(),
  getPublishedReport: vi.fn(),
  now: () => new Date('2026-03-21T12:00:00.000Z'),
  generateToken: () => 'fixed-token',
})

describe('public report publishing', () => {
  it('publishes a draft into a frozen snapshot and persists publish metadata', async () => {
    const dependencies = createDependencies()

    vi.mocked(dependencies.getReport).mockResolvedValue({
      id: 'report-1',
      title: 'March Report',
      summary: 'Summary',
      filters: {
        dateStart: '2026-03-01',
        dateEnd: '2026-03-21',
        projectIds: [],
        tagIds: [],
        groupOperator: 'intersection',
        tagOperator: 'any',
      },
      shareToken: '',
      createdAt: null,
      updatedAt: null,
      publishedAt: null,
    })
    vi.mocked(dependencies.getProjects).mockResolvedValue([{ id: 'project-1', name: 'Project 1' }])
    vi.mocked(dependencies.getTags).mockResolvedValue([{ id: 'tag-1', name: 'Tag 1' }])
    vi.mocked(dependencies.getTimeBoxes).mockResolvedValue([
      {
        id: 'tb-1',
        startTime: new Date('2026-03-10T16:00:00.000Z'),
        endTime: new Date('2026-03-10T18:00:00.000Z'),
        notes: 'Client work',
        project: 'project-1',
        tags: ['tag-1'],
      },
    ])

    const published = await publishReportDraft(dependencies, {
      uid: 'user-1',
      reportId: 'report-1',
    })

    expect(published.token).toBe('fixed-token')
    expect(published.snapshot.overview.totalMinutes).toBe(120)
    expect(dependencies.savePublishedReport).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fixed-token',
        title: 'March Report',
        sessionRows: expect.arrayContaining([
          expect.objectContaining({
            sessionId: 'tb-1',
            durationMinutes: 120,
          }),
        ]),
      }),
    )
    expect(dependencies.updateReportPublishState).toHaveBeenCalledWith({
      uid: 'user-1',
      reportId: 'report-1',
      shareToken: 'fixed-token',
      publishedAt: new Date('2026-03-21T12:00:00.000Z'),
    })
  })

  it('reuses the existing share token when republishing', async () => {
    const dependencies = createDependencies()

    vi.mocked(dependencies.getReport).mockResolvedValue({
      id: 'report-1',
      title: 'March Report',
      summary: 'Summary',
      filters: {
        dateStart: '2026-03-01',
        dateEnd: '2026-03-21',
        projectIds: [],
        tagIds: [],
        groupOperator: 'intersection',
        tagOperator: 'any',
      },
      shareToken: 'existing-token',
      createdAt: null,
      updatedAt: null,
      publishedAt: null,
    })
    vi.mocked(dependencies.getProjects).mockResolvedValue([{ id: 'project-1', name: 'Project 1' }])
    vi.mocked(dependencies.getTags).mockResolvedValue([{ id: 'tag-1', name: 'Tag 1' }])
    vi.mocked(dependencies.getTimeBoxes).mockResolvedValue([])

    const published = await publishReportDraft(dependencies, {
      uid: 'user-1',
      reportId: 'report-1',
    })

    expect(published.token).toBe('existing-token')
    expect(dependencies.updateReportPublishState).toHaveBeenCalledWith({
      uid: 'user-1',
      reportId: 'report-1',
      shareToken: 'existing-token',
      publishedAt: new Date('2026-03-21T12:00:00.000Z'),
    })
  })

  it('unpublishes a draft while preserving the stable token on the private report', async () => {
    const dependencies = createDependencies()

    vi.mocked(dependencies.getReport).mockResolvedValue({
      id: 'report-1',
      title: 'March Report',
      summary: 'Summary',
      filters: {
        dateStart: '2026-03-01',
        dateEnd: '2026-03-21',
        projectIds: [],
        tagIds: [],
        groupOperator: 'intersection',
        tagOperator: 'any',
      },
      shareToken: 'existing-token',
      createdAt: null,
      updatedAt: null,
      publishedAt: new Date('2026-03-21T12:00:00.000Z'),
    })

    await unpublishReportDraft(dependencies, {
      uid: 'user-1',
      reportId: 'report-1',
    })

    expect(dependencies.deletePublishedReport).toHaveBeenCalledWith('existing-token')
    expect(dependencies.updateReportPublishState).toHaveBeenCalledWith({
      uid: 'user-1',
      reportId: 'report-1',
      shareToken: 'existing-token',
      publishedAt: null,
    })
  })

  it('rebuilds grouped public session rows when fetching a public report', async () => {
    const dependencies = createDependencies()

    vi.mocked(dependencies.getPublishedReport).mockResolvedValue({
      token: 'public-token',
      title: 'March Report',
      summary: 'Summary',
      publishedAtIso: '2026-03-21T12:00:00.000Z',
      snapshot: {
        generatedAtIso: '2026-03-21T12:00:00.000Z',
        rangeStartDateKey: '2026-03-01',
        rangeEndDateKey: '2026-03-21',
        rangeLabel: 'Mar 1, 2026 - Mar 21, 2026',
        overview: {
          totalMinutes: 120,
          totalHours: 2,
          sessionCount: 1,
          activeDayCount: 1,
          averageMinutesPerActiveDay: 120,
          averageSessionMinutes: 120,
          busiestDayDateKey: '2026-03-10',
          busiestDayLabel: 'Mar 10, 2026',
          busiestDayMinutes: 120,
          longestSessionId: 'tb-1',
          longestSessionMinutes: 120,
          longestSessionProjectName: 'Project 1',
          firstLoggedDayDateKey: '2026-03-10',
          firstLoggedDayLabel: 'Mar 10, 2026',
          lastLoggedDayDateKey: '2026-03-10',
          lastLoggedDayLabel: 'Mar 10, 2026',
          contextSwitchCount: 0,
          metrics: [],
        },
        insights: [],
        projectBreakdown: [],
        tagBreakdown: [],
        projectTagMatrix: { columns: [], rows: [] },
        dailyRollups: [],
        weeklyRollups: [],
      },
      sessionRows: [
        {
          sessionId: 'tb-1',
          dateKey: '2026-03-10',
          projectId: 'project-1',
          projectName: 'Project 1',
          tagIds: ['tag-1'],
          tagNames: ['Tag 1'],
          notes: 'Client work',
          durationMinutes: 120,
          startTimeIso: '2026-03-10T16:00:00.000Z',
          endTimeIso: '2026-03-10T18:00:00.000Z',
          clampedStartTimeIso: '2026-03-10T16:00:00.000Z',
          clampedEndTimeIso: '2026-03-10T18:00:00.000Z',
        },
      ],
    })

    const report = await getPublishedReportByToken(dependencies, 'public-token')

    expect(report.snapshot.sessionGroups).toHaveLength(1)
    expect(report.snapshot.sessionGroups[0]?.sessions[0]?.sessionId).toBe('tb-1')
  })

  it('throws a not found error when the target draft or public token does not exist', async () => {
    const dependencies = createDependencies()
    vi.mocked(dependencies.getReport).mockResolvedValue(null)
    vi.mocked(dependencies.getPublishedReport).mockResolvedValue(null)

    await expect(
      publishReportDraft(dependencies, {
        uid: 'user-1',
        reportId: 'missing-report',
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<PublicReportError>>({ statusCode: 404 }))

    await expect(getPublishedReportByToken(dependencies, 'missing-token')).rejects.toEqual(
      expect.objectContaining<Partial<PublicReportError>>({ statusCode: 404 }),
    )
  })
})
