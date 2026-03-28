import type { EntityId } from './types'
import {
  createIdleTimerState,
  reviveTimerState,
  serializeTimerState,
  syncTimerState,
  type TimerState,
} from './timer'

export interface ActiveTimerState extends TimerState {
  project: EntityId
  tags: EntityId[]
  draftNotes: string
  updatedAtMs: number
  updatedByDeviceId: string
  mutationId: number
}

export interface ActiveTimerDraftInput {
  project?: EntityId
  tags?: EntityId[]
  draftNotes?: string
}

const normalizeOptionalEntityIds = (values: EntityId[] | null | undefined) =>
  Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)))

const normalizeOptionalString = (value: string | null | undefined) => value?.trim() ?? ''

const reviveNonNegativeInteger = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback

export const createIdleActiveTimerState = (): ActiveTimerState => ({
  ...createIdleTimerState(),
  project: '',
  tags: [],
  draftNotes: '',
  updatedAtMs: 0,
  updatedByDeviceId: '',
  mutationId: 0,
})

export const applyActiveTimerDraft = (
  state: ActiveTimerState,
  draft: ActiveTimerDraftInput,
): ActiveTimerState => ({
  ...state,
  project:
    draft.project === undefined ? state.project : normalizeOptionalString(draft.project) || '',
  tags: draft.tags === undefined ? state.tags : normalizeOptionalEntityIds(draft.tags),
  draftNotes:
    draft.draftNotes === undefined ? state.draftNotes : normalizeOptionalString(draft.draftNotes),
})

export const replaceActiveTimerState = (
  state: ActiveTimerState,
  timerState: TimerState,
): ActiveTimerState => ({
  ...state,
  ...timerState,
})

export const syncActiveTimerState = (state: ActiveTimerState, nowMs: number): ActiveTimerState => {
  const nextTimerState = syncTimerState(state, nowMs)

  return nextTimerState === state ? state : replaceActiveTimerState(state, nextTimerState)
}

export const serializeActiveTimerState = (state: ActiveTimerState) => ({
  ...serializeTimerState(state),
  project: state.project,
  tags: [...state.tags],
  draftNotes: state.draftNotes,
  updatedAtMs: state.updatedAtMs,
  updatedByDeviceId: state.updatedByDeviceId,
  mutationId: state.mutationId,
})

export const reviveActiveTimerState = (value: unknown): ActiveTimerState => {
  if (!value || typeof value !== 'object') {
    return createIdleActiveTimerState()
  }

  const candidate = value as Partial<ActiveTimerState>

  return {
    ...reviveTimerState(candidate),
    project: normalizeOptionalString(candidate.project),
    tags: normalizeOptionalEntityIds(candidate.tags),
    draftNotes: normalizeOptionalString(candidate.draftNotes),
    updatedAtMs: reviveNonNegativeInteger(candidate.updatedAtMs),
    updatedByDeviceId: normalizeOptionalString(candidate.updatedByDeviceId),
    mutationId: reviveNonNegativeInteger(candidate.mutationId),
  }
}
