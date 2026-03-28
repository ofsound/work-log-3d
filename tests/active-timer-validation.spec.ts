import { describe, expect, it } from 'vitest'

import {
  validateActiveTimerState,
  WorklogError,
  createIdleActiveTimerState,
  replaceActiveTimerState,
  startCountdownTimer,
} from '~/shared/worklog'

describe('active timer validation', () => {
  it('accepts a valid countdown active timer payload', () => {
    const valid = validateActiveTimerState({
      ...replaceActiveTimerState(createIdleActiveTimerState(), startCountdownTimer(1_800, 100)),
      project: ' project-1 ',
      tags: ['tag-1', 'tag-1', ''],
      draftNotes: ' Draft note ',
      updatedAtMs: 500,
      updatedByDeviceId: 'device-1',
      mutationId: 3,
    })

    expect(valid.project).toBe('project-1')
    expect(valid.tags).toEqual(['tag-1'])
    expect(valid.draftNotes).toBe('Draft note')
  })

  it('rejects countdown timers without duration metadata', () => {
    expect(() =>
      validateActiveTimerState({
        ...createIdleActiveTimerState(),
        mode: 'countdown',
        status: 'running',
        startedAtMs: 100,
        updatedAtMs: 200,
        updatedByDeviceId: 'device-1',
        mutationId: 1,
      }),
    ).toThrowError(WorklogError)
  })
})
