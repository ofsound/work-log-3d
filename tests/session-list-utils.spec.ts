import {
  applySessionListFilters,
  createDefaultSessionListFilters,
  createSessionListItem,
  getSessionListQueryTokens,
  matchesSessionListFilters,
  normalizeSessionListFilters,
} from '~~/shared/worklog'

describe('session list utilities', () => {
  const sampleItems = [
    createSessionListItem({
      timeBox: {
        id: 'tb-1',
        startTime: new Date('2026-03-10T16:00:00.000Z'),
        endTime: new Date('2026-03-10T17:30:00.000Z'),
        notes: 'Client bug triage and follow-up',
        project: 'project-a',
        tags: ['tag-bug', 'tag-client'],
      },
      projectName: 'Project Atlas',
      tagNames: ['Bug', 'Client'],
    }),
    createSessionListItem({
      timeBox: {
        id: 'tb-2',
        startTime: new Date('2026-03-11T07:30:00.000Z'),
        endTime: new Date('2026-03-11T10:30:00.000Z'),
        notes: 'Deep planning block',
        project: 'project-b',
        tags: ['tag-plan'],
      },
      projectName: 'Project Beacon',
      tagNames: ['Planning'],
    }),
    createSessionListItem({
      timeBox: {
        id: 'tb-3',
        startTime: new Date('2026-03-12T23:30:00.000Z'),
        endTime: new Date('2026-03-13T01:00:00.000Z'),
        notes: '',
        project: 'project-a',
        tags: [],
      },
      projectName: 'Project Atlas',
      tagNames: [],
    }),
  ]

  it('normalizes tokenized AND text search input', () => {
    expect(getSessionListQueryTokens('  Client   BUG  ')).toEqual(['client', 'bug'])
    expect(
      normalizeSessionListFilters({
        ...createDefaultSessionListFilters(),
        query: '  Client   BUG  ',
      }).query,
    ).toBe('client bug')
  })

  it('matches broad text search across notes, project names, and tag names', () => {
    expect(
      matchesSessionListFilters(
        sampleItems[0]!,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          query: 'atlas client',
        }),
      ),
    ).toBe(true)

    expect(
      matchesSessionListFilters(
        sampleItems[0]!,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          query: 'atlas missing',
        }),
      ),
    ).toBe(false)
  })

  it('supports tag any/all, notes state, and untagged-only filtering', () => {
    expect(
      matchesSessionListFilters(
        sampleItems[0]!,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          tagIds: ['tag-bug', 'tag-client'],
          tagMode: 'all',
        }),
      ),
    ).toBe(true)

    expect(
      matchesSessionListFilters(
        sampleItems[0]!,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          tagIds: ['tag-bug', 'tag-plan'],
          tagMode: 'all',
        }),
      ),
    ).toBe(false)

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          notesState: 'empty',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3'])

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          tagIds: ['tag-client'],
          untaggedOnly: true,
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3'])
  })

  it('applies overlap date filters and inclusive duration bounds', () => {
    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          dateStart: '2026-03-12',
          dateEnd: '2026-03-12',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3'])

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          minMinutes: 90,
          maxMinutes: 180,
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3', 'tb-2', 'tb-1'])
  })

  it('sorts by newest, oldest, longest, and shortest with deterministic ties', () => {
    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          sort: 'newest',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3', 'tb-2', 'tb-1'])

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          sort: 'oldest',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-1', 'tb-2', 'tb-3'])

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          sort: 'longest',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-2', 'tb-3', 'tb-1'])

    expect(
      applySessionListFilters(
        sampleItems,
        normalizeSessionListFilters({
          ...createDefaultSessionListFilters(),
          sort: 'shortest',
        }),
      ).map((item) => item.timeBox.id),
    ).toEqual(['tb-3', 'tb-1', 'tb-2'])
  })
})
