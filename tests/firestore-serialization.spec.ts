import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_USER_SETTINGS } from '~~/shared/worklog'

const addDoc = vi.fn()
const deleteDoc = vi.fn()
const doc = vi.fn((_collection, id: string) => ({ id }))
const getDoc = vi.fn()
const getDocs = vi.fn()
const limit = vi.fn((value: number) => ({ type: 'limit', value }))
const query = vi.fn((collection, ...constraints: unknown[]) => ({ collection, constraints }))
const setDoc = vi.fn()
const updateDoc = vi.fn()
const where = vi.fn((field: string, op: string, value: string) => ({ field, op, value }))
const fromDate = vi.fn((value: Date) => ({ __timestamp: value.toISOString() }))

vi.mock('firebase/firestore', () => ({
  Timestamp: { fromDate },
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
}))

const {
  createFirestoreWorklogRepositories,
  toDailyNote,
  toProject,
  toReport,
  toTimeBox,
  toUserSettings,
  toUserSettingsPayload,
} = await import('~/app/utils/worklog-firebase')

describe('firestore worklog repositories', () => {
  beforeEach(() => {
    addDoc.mockReset()
    deleteDoc.mockReset()
    doc.mockClear()
    fromDate.mockClear()
    getDoc.mockReset()
    getDocs.mockReset()
    limit.mockClear()
    query.mockClear()
    setDoc.mockReset()
    updateDoc.mockReset()
    where.mockClear()
    getDoc.mockResolvedValue({
      get: () => undefined,
    })
    getDocs.mockResolvedValue({ empty: true, size: 0, docs: [] })
  })

  it('hydrates legacy project documents with fallback notes and colors', () => {
    const project = toProject({
      id: 'project-legacy',
      name: 'Legacy Project',
      slug: 'legacy-project',
    })

    expect(project.notes).toBe('')
    expect(project.archived).toBe(false)
    expect(project.colors.primary).toMatch(/^#[0-9a-f]{6}$/)
    expect(project.colors.secondary).toMatch(/^#[0-9a-f]{6}$/)
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

  it('serializes daily note timestamps and falls back to an empty document', () => {
    const note = toDailyNote('2026-03-23', {
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Daily focus' }] }],
      },
      createdAt: { toDate: () => new Date('2026-03-23T08:00:00.000Z') },
      updatedAt: { toDate: () => new Date('2026-03-23T09:30:00.000Z') },
    })

    expect(note.dateKey).toBe('2026-03-23')
    expect(note.createdAt?.toISOString()).toBe('2026-03-23T08:00:00.000Z')
    expect(note.updatedAt?.toISOString()).toBe('2026-03-23T09:30:00.000Z')
    expect(toDailyNote('2026-03-24', null).content).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
  })

  it('serializes user settings with defaults and exact payload shape', () => {
    const settings = toUserSettings({
      appearance: {
        fontImportUrl:
          'https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap',
        fontFamilies: {
          ui: "'National Park', sans-serif",
          data: "'Lato', sans-serif",
        },
      },
    })

    expect(settings.appearance.fontFamilies.script).toBe("'Caveat', sans-serif")
    expect(settings.workflow.hideTags).toBe(false)
    expect(toUserSettingsPayload(settings)).toEqual({
      appearance: {
        fontImportUrl:
          'https://fonts.googleapis.com/css2?family=National+Park:wght@200..800&display=swap',
        fontFamilies: {
          ui: "'National Park', sans-serif",
          data: "'Lato', sans-serif",
          script: "'Caveat', sans-serif",
        },
        backgroundPreset: 'grid',
      },
      workflow: {
        hideTags: false,
        countdownDefaultMinutes: DEFAULT_USER_SETTINGS.workflow.countdownDefaultMinutes,
      },
      desktop: {
        trayShortcuts: [],
      },
    })
  })

  it('routes project and timebox writes through repository contracts', async () => {
    addDoc.mockResolvedValue({ id: 'created-id' })
    updateDoc.mockResolvedValue(undefined)
    deleteDoc.mockResolvedValue(undefined)
    getDoc.mockResolvedValue({
      get: (field: string) =>
        (
          ({
            name: 'Saved Project',
            slug: 'saved-project',
            notes: 'Existing notes',
            archived: false,
            colors: { primary: '#224466', secondary: '#88aacc' },
          }) as Record<string, unknown>
        )[field],
    })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      dailyNotesCollection: { id: 'dailyNotes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await repositories.projects.create({
      name: '  Focus Time  ',
      notes: '  Initial setup notes  ',
      colors: {
        primary: '#123456',
        secondary: 'abcdef',
      },
      archived: false,
    })
    await repositories.projects.rename('project-1', ' Renamed Project ')
    await repositories.projects.update('project-2', {
      name: '  Deep Work  ',
      notes: '  Notes for the edit page  ',
      colors: {
        primary: '#ABCDEF',
        secondary: '#112233',
      },
      archived: false,
    })
    await repositories.timeBoxes.create({
      startTime: new Date('2026-03-20T08:00:00.000Z'),
      endTime: new Date('2026-03-20T09:00:00.000Z'),
      notes: ' Notes ',
      project: ' project-1 ',
      tags: ['tag-1', 'tag-1', ''],
    })
    await repositories.tags.remove('tag-1')
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await repositories.dailyNotes.ensure('2026-03-21')
    getDoc.mockResolvedValueOnce({ exists: () => true })
    await repositories.dailyNotes.upsert('2026-03-21', {
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Focus list' }] }],
      },
    })
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
      expect.objectContaining({
        name: 'Focus Time',
        slug: 'focus-time',
        notes: 'Initial setup notes',
        colors: {
          primary: '#123456',
          secondary: '#abcdef',
        },
        archived: false,
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'project-1' },
      expect.objectContaining({
        name: 'Renamed Project',
        slug: 'renamed-project',
        notes: 'Existing notes',
        colors: {
          primary: '#224466',
          secondary: '#88aacc',
        },
        archived: false,
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'project-2' },
      expect.objectContaining({
        name: 'Deep Work',
        slug: 'deep-work',
        notes: 'Notes for the edit page',
        colors: {
          primary: '#abcdef',
          secondary: '#112233',
        },
        archived: false,
      }),
    )
    expect(fromDate).toHaveBeenCalledTimes(5)
    expect(addDoc).toHaveBeenCalledWith(
      { id: 'timeBoxes' },
      expect.objectContaining({
        tags: ['tag-1'],
      }),
    )
    expect(setDoc).toHaveBeenCalledWith(
      { id: '2026-03-21' },
      expect.objectContaining({
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
      }),
    )
    expect(updateDoc).toHaveBeenCalledWith(
      { id: '2026-03-21' },
      expect.objectContaining({
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Focus list' }] }],
        },
      }),
    )
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
    expect(query).toHaveBeenCalledWith(
      { id: 'projects' },
      expect.objectContaining({ field: 'slug', op: '==', value: 'renamed-project' }),
      expect.objectContaining({ type: 'limit', value: 2 }),
    )
    expect(query).toHaveBeenCalledWith(
      { id: 'projects' },
      expect.objectContaining({ field: 'slug', op: '==', value: 'deep-work' }),
      expect.objectContaining({ type: 'limit', value: 2 }),
    )
  })

  it('rejects creating a project when another project already has the same slug', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      size: 1,
      docs: [
        {
          id: 'existing',
          get: (field: string) => (field === 'slug' ? 'focus-time' : undefined),
        },
      ],
    })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      dailyNotesCollection: { id: 'dailyNotes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(
      repositories.projects.create({
        name: 'Focus Time',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
        archived: false,
      }),
    ).rejects.toThrow('Another project already uses this name.')
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('rejects creating a project that would conflict with the reserved new route', async () => {
    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      dailyNotesCollection: { id: 'dailyNotes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(
      repositories.projects.create({
        name: 'New',
        notes: '',
        colors: {
          primary: '#2563eb',
          secondary: '#06b6d4',
        },
        archived: false,
      }),
    ).rejects.toThrow('Project name would conflict with a reserved project route.')
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('rejects creating a tag when another tag already has the same slug', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 't1', get: (field: string) => (field === 'slug' ? 'alpha' : undefined) }],
    })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      dailyNotesCollection: { id: 'dailyNotes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(repositories.tags.create({ name: 'Alpha' })).rejects.toThrow(
      'Another tag already uses this name.',
    )
    expect(addDoc).not.toHaveBeenCalled()
  })

  it('blocks deleting projects or tags that still have sessions', async () => {
    getDocs.mockResolvedValue({ empty: false })

    const repositories = createFirestoreWorklogRepositories({
      projectsCollection: { id: 'projects' } as never,
      tagsCollection: { id: 'tags' } as never,
      timeBoxesCollection: { id: 'timeBoxes' } as never,
      dailyNotesCollection: { id: 'dailyNotes' } as never,
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
      dailyNotesCollection: { id: 'dailyNotes' } as never,
      reportsCollection: { id: 'reports' } as never,
    })

    await expect(
      repositories.timeBoxes.create({
        startTime: new Date('2026-03-20T09:00:00.000Z'),
        endTime: new Date('2026-03-20T08:00:00.000Z'),
        notes: '',
        project: '',
        tags: ['tag-1'],
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
      dailyNotesCollection: { id: 'dailyNotes' } as never,
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
