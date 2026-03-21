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

const { createFirestoreWorklogRepositories, toTimeBox } =
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

  it('routes project and timebox writes through repository contracts', async () => {
    addDoc.mockResolvedValue({ id: 'created-id' })
    updateDoc.mockResolvedValue(undefined)
    deleteDoc.mockResolvedValue(undefined)

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
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

    expect(addDoc).toHaveBeenCalledWith(
      { id: 'projects' },
      expect.objectContaining({ name: 'Focus Time', slug: 'focus-time' }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'project-1' },
      expect.objectContaining({ name: 'Renamed Project', slug: 'renamed-project' }),
    )
    expect(fromDate).toHaveBeenCalledTimes(2)
    expect(deleteDoc).toHaveBeenCalledWith({ id: 'tag-1' })
    expect(query).toHaveBeenCalledWith(
      { id: 'timeBoxes' },
      expect.objectContaining({ field: 'tags', op: 'array-contains', value: 'tag-1' }),
      expect.objectContaining({ type: 'limit', value: 1 }),
    )
  })

  it('blocks deleting projects or tags that still have sessions', async () => {
    getDocs.mockResolvedValue({ empty: false })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
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
})
