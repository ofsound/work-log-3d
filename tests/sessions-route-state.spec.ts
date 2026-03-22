import { buildSessionsRouteQuery, parseSessionsRouteState } from '~/app/utils/sessions-route-state'

describe('sessions route state', () => {
  it('defaults to day mode, fallback date, and default list filters', () => {
    const fallbackDate = new Date(2026, 2, 21, 12, 0, 0, 0)
    const state = parseSessionsRouteState({}, fallbackDate)

    expect(state.mode).toBe('day')
    expect(state.date).toEqual(fallbackDate)
    expect(state.listFilters).toEqual({
      query: '',
      projectIds: [],
      tagIds: [],
      tagMode: 'any',
      dateStart: '',
      dateEnd: '',
      minMinutes: null,
      maxMinutes: null,
      untaggedOnly: false,
      notesState: 'any',
      sort: 'newest',
    })
  })

  it('parses supported mode, date, and normalized list filter params', () => {
    const state = parseSessionsRouteState({
      mode: 'list',
      date: '2026-03-21',
      q: '  client   bug ',
      projects: 'project-b,project-a,project-a',
      tags: 'tag-b,tag-a',
      tagMode: 'all',
      from: '2026-03-01',
      to: '2026-03-31',
      min: '90',
      max: '30',
      untagged: 'true',
      notes: 'with',
      sort: 'longest',
    })

    expect(state.mode).toBe('list')
    expect(state.date.getFullYear()).toBe(2026)
    expect(state.date.getMonth()).toBe(2)
    expect(state.date.getDate()).toBe(21)
    expect(state.listFilters).toEqual({
      query: 'client bug',
      projectIds: ['project-a', 'project-b'],
      tagIds: [],
      tagMode: 'all',
      dateStart: '2026-03-01',
      dateEnd: '2026-03-31',
      minMinutes: 30,
      maxMinutes: 90,
      untaggedOnly: true,
      notesState: 'with',
      sort: 'longest',
    })
  })

  it('drops invalid list filter params while keeping valid ones', () => {
    const state = parseSessionsRouteState({
      mode: 'list',
      q: '   ',
      tagMode: 'bad',
      from: 'nope',
      to: '2026-03-05',
      min: 'wat',
      max: '-1',
      notes: 'bogus',
      sort: 'bad',
    })

    expect(state.listFilters).toEqual({
      query: '',
      projectIds: [],
      tagIds: [],
      tagMode: 'any',
      dateStart: '',
      dateEnd: '2026-03-05',
      minMinutes: null,
      maxMinutes: null,
      untaggedOnly: false,
      notesState: 'any',
      sort: 'newest',
    })
  })

  it('serializes list mode with stable ids and omits default filters except sort', () => {
    const query = buildSessionsRouteQuery(
      {
        mode: 'list',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
        listFilters: {
          query: 'client bug',
          projectIds: ['project-b', 'project-a'],
          tagIds: ['tag-b', 'tag-a'],
          tagMode: 'all',
          dateStart: '2026-03-01',
          dateEnd: '2026-03-31',
          minMinutes: 120,
          maxMinutes: 30,
          untaggedOnly: false,
          notesState: 'empty',
          sort: 'shortest',
        },
      },
      { preserved: 'yes' },
    )

    expect(query).toEqual({
      preserved: 'yes',
      mode: 'list',
      date: '2026-03-21',
      q: 'client bug',
      projects: 'project-a,project-b',
      tags: 'tag-a,tag-b',
      tagMode: 'all',
      from: '2026-03-01',
      to: '2026-03-31',
      min: '30',
      max: '120',
      notes: 'empty',
      sort: 'shortest',
    })
  })

  it('omits mode on default day view and removes list-only params outside list mode', () => {
    const query = buildSessionsRouteQuery(
      {
        mode: 'day',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
        listFilters: {
          query: 'focus',
          projectIds: ['project-a'],
          tagIds: ['tag-a'],
          tagMode: 'all',
          dateStart: '2026-03-01',
          dateEnd: '2026-03-02',
          minMinutes: 15,
          maxMinutes: 60,
          untaggedOnly: true,
          notesState: 'with',
          sort: 'longest',
        },
      },
      {
        q: 'focus',
        projects: 'project-a',
        tags: 'tag-a',
        tagMode: 'all',
        from: '2026-03-01',
        to: '2026-03-02',
        min: '15',
        max: '60',
        untagged: '1',
        notes: 'with',
        sort: 'longest',
      },
    )

    expect(query).toEqual({
      date: '2026-03-21',
    })
  })

  it('keeps explicit list mode in the query and always persists the current sort', () => {
    const query = buildSessionsRouteQuery({
      mode: 'list',
      date: new Date(2026, 2, 21, 12, 0, 0, 0),
      listFilters: {
        query: '',
        projectIds: [],
        tagIds: [],
        tagMode: 'any',
        dateStart: '',
        dateEnd: '',
        minMinutes: null,
        maxMinutes: null,
        untaggedOnly: false,
        notesState: 'any',
        sort: 'newest',
      },
    })

    expect(query).toEqual({
      mode: 'list',
      date: '2026-03-21',
      sort: 'newest',
    })
  })
})
