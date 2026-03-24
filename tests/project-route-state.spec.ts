import {
  buildProjectRouteQuery,
  buildProjectWorkspaceLocation,
  parseProjectRouteState,
} from '~/app/utils/project-route-state'

describe('project route state', () => {
  it('defaults to list mode and the fallback date', () => {
    const fallbackDate = new Date(2026, 2, 21, 12, 0, 0, 0)
    const state = parseProjectRouteState({}, fallbackDate)

    expect(state.mode).toBe('list')
    expect(state.date).toEqual(fallbackDate)
  })

  it('parses calendar mode and a valid date', () => {
    const state = parseProjectRouteState({
      mode: 'calendar',
      date: '2026-03-21',
    })

    expect(state.mode).toBe('calendar')
    expect(state.date).not.toBeNull()
    expect(state.date!.getFullYear()).toBe(2026)
    expect(state.date!.getMonth()).toBe(2)
    expect(state.date!.getDate()).toBe(21)
  })

  it('parses calendar mode with no date as null (no day selected)', () => {
    const state = parseProjectRouteState({
      mode: 'calendar',
    })

    expect(state.mode).toBe('calendar')
    expect(state.date).toBeNull()
  })

  it('falls back safely when mode or date are invalid', () => {
    const fallbackDate = new Date(2026, 2, 18, 12, 0, 0, 0)
    const state = parseProjectRouteState(
      {
        mode: 'month',
        date: 'nope',
      },
      fallbackDate,
    )

    expect(state.mode).toBe('list')
    expect(state.date).toEqual(fallbackDate)
  })

  it('serializes calendar mode and preserves unrelated query params', () => {
    const query = buildProjectRouteQuery(
      {
        mode: 'calendar',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
      },
      { preserved: 'yes' },
    )

    expect(query).toEqual({
      preserved: 'yes',
      mode: 'calendar',
      date: '2026-03-21',
    })
  })

  it('omits date when calendar has no day selected', () => {
    const query = buildProjectRouteQuery(
      {
        mode: 'calendar',
        date: null,
      },
      { preserved: 'yes' },
    )

    expect(query).toEqual({
      preserved: 'yes',
      mode: 'calendar',
    })
  })

  it('omits the default list mode while keeping the selected date', () => {
    const query = buildProjectRouteQuery(
      {
        mode: 'list',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
      },
      { mode: 'calendar' },
    )

    expect(query).toEqual({
      date: '2026-03-21',
    })
  })

  it('builds edit locations while preserving route context', () => {
    const location = buildProjectWorkspaceLocation(
      'client-portal',
      'edit',
      {
        mode: 'calendar',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
      },
      { preserved: 'yes' },
    )

    expect(location).toEqual({
      path: '/project/client-portal/edit',
      query: {
        preserved: 'yes',
        mode: 'calendar',
        date: '2026-03-21',
      },
    })
  })

  it('builds overview locations from edit while restoring the requested mode', () => {
    const location = buildProjectWorkspaceLocation(
      'client-portal',
      'list',
      {
        mode: 'calendar',
        date: new Date(2026, 2, 21, 12, 0, 0, 0),
      },
      { preserved: 'yes' },
    )

    expect(location).toEqual({
      path: '/project/client-portal',
      query: {
        preserved: 'yes',
        date: '2026-03-21',
      },
    })
  })
})
