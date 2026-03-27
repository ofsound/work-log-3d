import { formatDateKey, parseDateKey } from './calendar'
import {
  cloneDailyNoteContent,
  DAILY_NOTE_MAX_LINES,
  getDailyNoteLineCount,
  isDailyNoteContentNode,
  type DailyNoteInput,
} from './daily-notes'
import { slugifyName } from './formatters'
import {
  getProjectColorValidationMessages,
  PRIMARY_COLOR_BADGE_TEXT_ERROR,
  SECONDARY_COLOR_GRADIENT_TEXT_ERROR,
} from './project-colors'
import { normalizeHexColor } from './projects'
import {
  REPORT_GROUP_OPERATORS,
  REPORT_TAG_OPERATORS,
  type ReportFilter,
  type ReportGroupOperator,
  type ReportInput,
  type ReportTagOperator,
} from './reports'
import { validateUserSettings, type UserSettings } from './settings'
import type { EntityId, ProjectInput, TimeBoxInput } from './types'

export type WorklogErrorCode = 'validation' | 'entity-in-use' | 'duplicate-slug'

export class WorklogError extends Error {
  constructor(
    public readonly code: WorklogErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorklogError'
  }
}

const RESERVED_PROJECT_SLUGS = new Set(['new'])

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

const requireHexColor = (value: string, label: string) => {
  const normalized = normalizeHexColor(value)

  if (!normalized) {
    throw new WorklogError('validation', `${label} must be a valid hex color.`)
  }

  return normalized
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

export const validateProjectInput = (input: ProjectInput): ProjectInput => ({
  name: requireNonEmptyString(input.name, 'Project'),
  notes: normalizeOptionalString(input.notes),
  colors: (() => {
    const normalized = {
      primary: requireHexColor(input.colors.primary, 'Primary color'),
      secondary: requireHexColor(input.colors.secondary, 'Secondary color'),
    }
    const messages = getProjectColorValidationMessages(normalized)

    if (messages.includes(PRIMARY_COLOR_BADGE_TEXT_ERROR)) {
      throw new WorklogError('validation', PRIMARY_COLOR_BADGE_TEXT_ERROR)
    }

    if (messages.includes(SECONDARY_COLOR_GRADIENT_TEXT_ERROR)) {
      throw new WorklogError('validation', SECONDARY_COLOR_GRADIENT_TEXT_ERROR)
    }

    return normalized
  })(),
  archived: input.archived === true,
})

export const createProjectPayload = (input: ProjectInput) => {
  const normalized = validateProjectInput(input)
  const slug = slugifyName(normalized.name)

  if (!slug) {
    throw new WorklogError('validation', `Project must include letters or numbers.`)
  }

  if (RESERVED_PROJECT_SLUGS.has(slug)) {
    throw new WorklogError(
      'validation',
      'Project name would conflict with a reserved project route.',
    )
  }

  return {
    name: normalized.name,
    slug,
    notes: normalized.notes,
    colors: normalized.colors,
    archived: normalized.archived,
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
    tags: normalizeOptionalEntityIds(input.tags),
  }
}

export const validateDailyNoteInput = (
  dateKey: string,
  input: DailyNoteInput,
): { dateKey: string; content: ReturnType<typeof cloneDailyNoteContent> } => {
  const normalizedDateKey = requireDateKey(dateKey, 'Date')

  if (!isDailyNoteContentNode(input.content) || input.content.type !== 'doc') {
    throw new WorklogError('validation', 'Daily note content must be a valid rich-text document.')
  }

  const content = cloneDailyNoteContent(input.content)

  if (getDailyNoteLineCount(content) > DAILY_NOTE_MAX_LINES) {
    throw new WorklogError(
      'validation',
      `Daily note content must stay within ${DAILY_NOTE_MAX_LINES} lines.`,
    )
  }

  return {
    dateKey: normalizedDateKey,
    content,
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

export const validateUserSettingsInput = (input: UserSettings): UserSettings => {
  try {
    return validateUserSettings(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Settings are invalid.'

    throw new WorklogError('validation', message)
  }
}

export const createEntityInUseError = (entityLabel: string) =>
  new WorklogError(
    'entity-in-use',
    `Cannot delete this ${entityLabel} while sessions still reference it.`,
  )

export const createDuplicateSlugError = (entityLabel: 'project' | 'tag') =>
  new WorklogError(
    'duplicate-slug',
    entityLabel === 'project'
      ? 'Another project already uses this name.'
      : 'Another tag already uses this name.',
  )

export const getWorklogErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof WorklogError) {
    return error.message
  }

  return fallbackMessage
}
