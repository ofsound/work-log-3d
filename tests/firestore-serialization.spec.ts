import { beforeEach, describe, expect, it, vi } from 'vitest'

const addDoc = vi.fn()
const deleteDoc = vi.fn()
const doc = vi.fn((_collection, id: string) => ({ id }))
const getDocs = vi.fn()
const limit = vi.fn((value: number) => ({ type: 'limit', value }))
const query = vi.fn((collection, ...constraints: unknown[]) => ({ collection, constraints }))
const updateDoc = vi.fn()
const where = vi.fn((field: string, op: string, value: string) => ({ field, op, value }))
const fromDate = vi.fn((value: Date) => ({ __timestamp: value.toISOString() }))

vi.mock('firebase/firestore', () => ({
  Timestamp: { fromDate },
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
}))

const { createFirestoreWorklogRepositories, toReport, toTimeBox } =
  await import('~/app/utils/worklog-firebase')

describe('firestore worklog repositories', () => {
  beforeEach(() => {
    addDoc.mockReset()
    deleteDoc.mockReset()
    doc.mockClear()
    fromDate.mockClear()
    getDocs.mockReset()
    limit.mockClear()
    query.mockClear()
    updateDoc.mockReset()
    where.mockClear()
    getDocs.mockResolvedValue({ empty: true })
  })

  it('serializes timebox timestamps into plain dates', () => {
    const timeBox = toTimeBox({
      id: 'tb-1',
      startTime: { toDate: () => new Date('2026-03-20T08:00:00.000Z') },
      endTime: { toDate: () => new Date('2026-03-20T09:30:00.000Z') },
      notes: 'Deep work',
      project: 'project-1',
      tags: ['tag-1'],
    })

    expect(timeBox.startTime?.toISOString()).toBe('2026-03-20T08:00:00.000Z')
    expect(timeBox.endTime?.toISOString()).toBe('2026-03-20T09:30:00.000Z')
  })

  it('serializes report timestamps and nested filters into plain values', () => {
    const report = toReport({
      id: 'report-1',
      title: 'March Report',
      summary: 'Summary',
      timezone: 'America/Denver',
      filters: {
        dateStart: '2026-03-01',
        dateEnd: '2026-03-21',
        projectIds: ['project-1'],
        tagIds: ['tag-1'],
        groupOperator: 'intersection',
        tagOperator: 'any',
      },
      shareToken: 'token-1',
      createdAt: { toDate: () => new Date('2026-03-20T08:00:00.000Z') },
      updatedAt: { toDate: () => new Date('2026-03-21T08:00:00.000Z') },
      publishedAt: null,
    })

    expect(report.createdAt?.toISOString()).toBe('2026-03-20T08:00:00.000Z')
    expect(report.updatedAt?.toISOString()).toBe('2026-03-21T08:00:00.000Z')
    expect(report.filters.projectIds).toEqual(['project-1'])
    expect(report.shareToken).toBe('token-1')
  })

  it('routes project and timebox writes through repository contracts', async () => {
    addDoc.mockResolvedValue({ id: 'created-id' })
    updateDoc.mockResolvedValue(undefined)
    deleteDoc.mockResolvedValue(undefined)

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await repositories.projects.create({ name: '  Focus Time  ' })
    await repositories.projects.rename('project-1', ' Renamed Project ')
    await repositories.timeBoxes.create({
      startTime: new Date('2026-03-20T08:00:00.000Z'),
      endTime: new Date('2026-03-20T09:00:00.000Z'),
      notes: ' Notes ',
      project: ' project-1 ',
      tags: ['tag-1', 'tag-1'],
    })
    await repositories.tags.remove('tag-1')
    await repositories.reports.create({
      title: '  March Report  ',
      summary: ' Summary ',
      timezone: 'America/Denver',
      filters: {
        dateStart: '2026-03-01',
        dateEnd: '2026-03-21',
        projectIds: [' project-1 ', 'project-1'],
        tagIds: ['tag-1'],
        groupOperator: 'intersection',
        tagOperator: 'any',
      },
    })

    expect(addDoc).toHaveBeenCalledWith(
      { id: 'projects' },
      expect.objectContaining({ name: 'Focus Time', slug: 'focus-time' }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'project-1' },
      expect.objectContaining({ name: 'Renamed Project', slug: 'renamed-project' }),
    )
    expect(fromDate).toHaveBeenCalledTimes(3)
    expect(deleteDoc).toHaveBeenCalledWith({ id: 'tag-1' })
    expect(query).toHaveBeenCalledWith(
      { id: 'timeBoxes' },
      expect.objectContaining({ field: 'tags', op: 'array-contains', value: 'tag-1' }),
      expect.objectContaining({ type: 'limit', value: 1 }),
    )
    expect(addDoc).toHaveBeenCalledWith(
      { id: 'reports' },
      expect.objectContaining({
        title: 'March Report',
        summary: 'Summary',
        timezone: 'America/Denver',
        shareToken: '',
        filters: expect.objectContaining({
          projectIds: ['project-1'],
          groupOperator: 'intersection',
        }),
      }),
    )
  })

  it('blocks deleting projects or tags that still have sessions', async () => {
    getDocs.mockResolvedValue({ empty: false })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(repositories.projects.remove('project-1')).rejects.toThrow(
      'Cannot delete this project while sessions still reference it.',
    )
    await expect(repositories.tags.remove('tag-1')).rejects.toThrow(
      'Cannot delete this tag while sessions still reference it.',
    )
    expect(deleteDoc).not.toHaveBeenCalled()
  })

  it('rejects malformed timebox input before writing', async () => {
    addDoc.mockResolvedValue({ id: 'created-id' })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(
      repositories.timeBoxes.create({
        startTime: new Date('2026-03-20T09:00:00.000Z'),
        endTime: new Date('2026-03-20T08:00:00.000Z'),
        notes: '',
        project: '',
        tags: [],
      }),
    ).rejects.toThrow('End time must be after the start time.')
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('rejects malformed report input before writing', async () => {
    addDoc.mockResolvedValue({ id: 'created-id' })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(
      repositories.reports.create({
        title: '',
        summary: 'Bad report',
        timezone: 'America/Denver',
        filters: {
          dateStart: '2026-03-21',
          dateEnd: '2026-03-01',
          projectIds: [],
          tagIds: [],
          groupOperator: 'intersection',
          tagOperator: 'any',
        },
      }),
    ).rejects.toThrow('Title is required.')
    expect(addDoc).not.toHaveBeenCalled()
  })
})
