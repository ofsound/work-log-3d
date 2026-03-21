import { slugifyName } from './formatters'
import type { EntityId, TimeBoxInput } from './types'

export type WorklogErrorCode = 'validation' | 'entity-in-use'

export class WorklogError extends Error {
  constructor(
    public readonly code: WorklogErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorklogError'
  }
}

const cloneDate = (value: Date) => new Date(value.valueOf())

const isValidDate = (value: Date) => Number.isFinite(value.valueOf())

const requireNonEmptyString = (value: string, label: string) => {
  const normalized = value.trim()

  if (!normalized) {
    throw new WorklogError('validation', `${label} is required.`)
  }

  return normalized
}

const normalizeEntityIds = (values: EntityId[], label: string) => {
  const normalized = values.map((value) => value.trim()).filter(Boolean)

  if (normalized.length === 0) {
    throw new WorklogError('validation', `${label} is required.`)
  }

  return [...new Set(normalized)]
}

export const createNamedEntityPayload = (name: string, label: string) => {
  const normalizedName = requireNonEmptyString(name, label)
  const slug = slugifyName(normalizedName)

  if (!slug) {
    throw new WorklogError('validation', `${label} must include letters or numbers.`)
  }

  return {
    name: normalizedName,
    slug,
  }
}

export const validateTimeBoxInput = (input: TimeBoxInput): TimeBoxInput => {
  if (!(input.startTime instanceof Date) || !isValidDate(input.startTime)) {
    throw new WorklogError('validation', 'Start time must be a valid date.')
  }

  if (!(input.endTime instanceof Date) || !isValidDate(input.endTime)) {
    throw new WorklogError('validation', 'End time must be a valid date.')
  }

  if (input.endTime.valueOf() <= input.startTime.valueOf()) {
    throw new WorklogError('validation', 'End time must be after the start time.')
  }

  return {
    startTime: cloneDate(input.startTime),
    endTime: cloneDate(input.endTime),
    notes: requireNonEmptyString(input.notes, 'Notes'),
    project: requireNonEmptyString(input.project, 'Project'),
    tags: normalizeEntityIds(input.tags, 'At least one tag'),
  }
}

export const createEntityInUseError = (entityLabel: string) =>
  new WorklogError(
    'entity-in-use',
    `Cannot delete this ${entityLabel} while sessions still reference it.`,
  )

export const getWorklogErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof WorklogError) {
    return error.message
  }

  return fallbackMessage
}
