import { describe, expect, it } from 'vitest'

import { formatSecondsAsMinSecPhrase } from '~~/shared/worklog/formatters'

describe('formatSecondsAsMinSecPhrase', () => {
  it('formats under one minute as seconds only', () => {
    expect(formatSecondsAsMinSecPhrase(0)).toBe('0 sec')
    expect(formatSecondsAsMinSecPhrase(1)).toBe('1 sec')
    expect(formatSecondsAsMinSecPhrase(59)).toBe('59 sec')
  })

  it('formats whole minutes', () => {
    expect(formatSecondsAsMinSecPhrase(60)).toBe('1 min')
    expect(formatSecondsAsMinSecPhrase(300)).toBe('5 min')
  })

  it('formats mixed minutes and seconds', () => {
    expect(formatSecondsAsMinSecPhrase(61)).toBe('1 min 1 sec')
    expect(formatSecondsAsMinSecPhrase(90)).toBe('1 min 30 sec')
  })

  it('floors non-integer seconds', () => {
    expect(formatSecondsAsMinSecPhrase(59.9)).toBe('59 sec')
    expect(formatSecondsAsMinSecPhrase(90.2)).toBe('1 min 30 sec')
  })

  it('handles invalid input', () => {
    expect(formatSecondsAsMinSecPhrase(Number.NaN)).toBe('0 sec')
    expect(formatSecondsAsMinSecPhrase(-1)).toBe('0 sec')
  })
})
