import { buildSessionsRouteQuery, parseSessionsRouteState } from '~/app/utils/sessions-route-state'

describe('sessions route state', () => {
  it('defaults to day mode and the provided fallback date', () => {
    const fallbackDate = new Date(2026, 2, 21, 12, 0, 0, 0)
    const state = parseSessionsRouteState({}, fallbackDate)

    expect(state.mode).toBe('day')
    expect(state.date).toEqual(fallbackDate)
  })

  it('parses supported mode and date query params', () => {
    const state = parseSessionsRouteState({
      mode: 'week',
      date: '2026-03-21',
    })

    expect(state.mode).toBe('week')
    expect(state.date.getFullYear()).toBe(2026)
    expect(state.date.getMonth()).toBe(2)
    expect(state.date.getDate()).toBe(21)
  })

  it('drops invalid modes and keeps unrelated query params when serializing', () => {
    const query = buildSessionsRouteQuery(
      {
        mode: 'month',
        date: new Date(2026, 2, 1, 12, 0, 0, 0),
      },
      { filter: 'focus', mode: 'bogus' },
    )

    expect(query).toEqual({
      filter: 'focus',
      mode: 'month',
      date: '2026-03-01',
    })
  })

  it('omits the mode query when the route is on the default day view', () => {
    const query = buildSessionsRouteQuery({
      mode: 'day',
      date: new Date(2026, 2, 21, 12, 0, 0, 0),
    })

    expect(query).toEqual({
      date: '2026-03-21',
    })
  })

  it('keeps explicit list mode in the query now that day is the default', () => {
    const query = buildSessionsRouteQuery({
      mode: 'list',
      date: new Date(2026, 2, 21, 12, 0, 0, 0),
    })

    expect(query).toEqual({
      mode: 'list',
      date: '2026-03-21',
    })
  })
})
