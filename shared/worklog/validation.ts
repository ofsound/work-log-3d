import { formatDateKey, parseDateKey } from './calendar'
import { slugifyName } from './formatters'
import {
  REPORT_GROUP_OPERATORS,
  REPORT_TAG_OPERATORS,
  type ReportFilter,
  type ReportGroupOperator,
  type ReportInput,
  type ReportTagOperator,
} from './reports'
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

const normalizeOptionalString = (value: string) => value.trim()

const normalizeEntityIds = (values: EntityId[], label: string) => {
  const normalized = values.map((value) => value.trim()).filter(Boolean)

  if (normalized.length === 0) {
    throw new WorklogError('validation', `${label} is required.`)
  }

  return [...new Set(normalized)]
}

const normalizeOptionalEntityIds = (values: EntityId[]) => {
  const normalized = values.map((value) => value.trim()).filter(Boolean)

  return [...new Set(normalized)]
}

const requireDateKey = (value: string, label: string) => {
  const normalized = requireNonEmptyString(value, label)
  const parsed = parseDateKey(normalized)

  if (!parsed) {
    throw new WorklogError('validation', `${label} must use YYYY-MM-DD.`)
  }

  return formatDateKey(parsed)
}

const requireTimeZone = (value: string) => {
  const normalized = requireNonEmptyString(value, 'Timezone')

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized }).format(new Date())
  } catch {
    throw new WorklogError('validation', 'Timezone must be valid.')
  }

  return normalized
}

const requireEnumValue = <T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T => {
  const normalized = value.trim()

  if (values.includes(normalized as T)) {
    return normalized as T
  }

  throw new WorklogError('validation', `${label} is invalid.`)
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

export const validateReportFilter = (input: ReportFilter): ReportFilter => {
  const dateStart = requireDateKey(input.dateStart, 'Start date')
  const dateEnd = requireDateKey(input.dateEnd, 'End date')
  const parsedStart = parseDateKey(dateStart)
  const parsedEnd = parseDateKey(dateEnd)

  if (!parsedStart || !parsedEnd || parsedEnd.valueOf() < parsedStart.valueOf()) {
    throw new WorklogError('validation', 'End date must be on or after the start date.')
  }

  return {
    dateStart,
    dateEnd,
    projectIds: normalizeOptionalEntityIds(input.projectIds),
    tagIds: normalizeOptionalEntityIds(input.tagIds),
    groupOperator: requireEnumValue<ReportGroupOperator>(
      input.groupOperator,
      REPORT_GROUP_OPERATORS,
      'Group operator',
    ),
    tagOperator: requireEnumValue<ReportTagOperator>(
      input.tagOperator,
      REPORT_TAG_OPERATORS,
      'Tag operator',
    ),
  }
}

export const validateReportInput = (input: ReportInput): ReportInput => ({
  title: requireNonEmptyString(input.title, 'Title'),
  summary: normalizeOptionalString(input.summary),
  timezone: requireTimeZone(input.timezone),
  filters: validateReportFilter(input.filters),
})

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
