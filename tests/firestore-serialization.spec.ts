import { beforeEach, describe, expect, it, vi } from 'vitest'

const addDoc = vi.fn()
const deleteDoc = vi.fn()
const doc = vi.fn((_collection, id: string) => ({ id }))
const updateDoc = vi.fn()
const fromDate = vi.fn((value: Date) => ({ __timestamp: value.toISOString() }))

vi.mock('firebase/firestore', () => ({
  Timestamp: { fromDate },
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
}))

const { createFirestoreWorklogRepositories, toTimeBox } =
  await import('~/app/utils/worklog-firebase')

describe('firestore worklog repositories', () => {
  beforeEach(() => {
    addDoc.mockReset()
    deleteDoc.mockReset()
    doc.mockClear()
    fromDate.mockClear()
    updateDoc.mockReset()
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

    await repositories.projects.create({ name: 'Focus Time' })
    await repositories.projects.rename('project-1', 'Renamed Project')
    await repositories.timeBoxes.create({
      startTime: new Date('2026-03-20T08:00:00.000Z'),
      endTime: new Date('2026-03-20T09:00:00.000Z'),
      notes: 'Notes',
      project: 'project-1',
      tags: ['tag-1'],
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
  })
})
