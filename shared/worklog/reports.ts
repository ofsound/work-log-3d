import { addDays, formatDateKey, getStartOfWeek, parseDateKey } from './calendar'
import { formatMinutesAsDecimalHours } from './formatters'

import type { EntityId, NamedEntity, TimeBox } from './types'

export const REPORT_GROUP_OPERATORS = ['intersection', 'union'] as const
export const REPORT_TAG_OPERATORS = ['any', 'all'] as const

export type ReportGroupOperator = (typeof REPORT_GROUP_OPERATORS)[number]
export type ReportTagOperator = (typeof REPORT_TAG_OPERATORS)[number]

export interface ReportFilter {
  dateStart: string
  dateEnd: string
  projectIds: EntityId[]
  tagIds: EntityId[]
  groupOperator: ReportGroupOperator
  tagOperator: ReportTagOperator
}

export interface ReportInput {
  title: string
  summary: string
  timezone: string
  filters: ReportFilter
}

export interface Report extends ReportInput {
  id: EntityId
  shareToken: string
  createdAt: Date | null
  updatedAt: Date | null
  publishedAt: Date | null
}

export interface ReportOverviewMetric {
  label: string
  value: string
}

export interface ReportOverview {
  totalMinutes: number
  totalHours: number
  sessionCount: number
  activeDayCount: number
  averageMinutesPerActiveDay: number
  averageSessionMinutes: number
  busiestDayDateKey: string
  busiestDayLabel: string
  busiestDayMinutes: number
  longestSessionId: string
  longestSessionMinutes: number
  longestSessionProjectName: string
  firstLoggedDayDateKey: string
  firstLoggedDayLabel: string
  lastLoggedDayDateKey: string
  lastLoggedDayLabel: string
  contextSwitchCount: number
  metrics: ReportOverviewMetric[]
}

export interface ReportBreakdownItem {
  id: string
  label: string
  minutes: number
  hours: number
  percentageOfTotal: number
  sessionCount: number
}

export interface ReportMatrixColumn {
  tagId: string
  tagName: string
  minutes: number
  hours: number
}

export interface ReportMatrixCell {
  tagId: string
  tagName: string
  minutes: number
  hours: number
}

export interface ReportMatrixRow {
  projectId: string
  projectName: string
  minutes: number
  hours: number
  cells: ReportMatrixCell[]
}

export interface ReportProjectTagMatrix {
  columns: ReportMatrixColumn[]
  rows: ReportMatrixRow[]
}

export interface ReportRollup {
  dateKey: string
  label: string
  minutes: number
  hours: number
  sessionCount: number
}

export interface ReportWeekRollup {
  weekStartDateKey: string
  weekEndDateKey: string
  label: string
  minutes: number
  hours: number
  sessionCount: number
}

export interface ReportSessionRow {
  sessionId: string
  dateKey: string
  projectId: string
  projectName: string
  tagIds: string[]
  tagNames: string[]
  notes: string
  durationMinutes: number
  startTimeIso: string
  endTimeIso: string
  clampedStartTimeIso: string
  clampedEndTimeIso: string
}

export interface ReportSessionGroup {
  dateKey: string
  label: string
  totalMinutes: number
  totalHours: number
  sessionCount: number
  sessions: ReportSessionRow[]
}

export interface ReportInsight {
  id: string
  label: string
  value: string
}

export interface ReportSnapshot {
  generatedAtIso: string
  timezone: string
  rangeStartDateKey: string
  rangeEndDateKey: string
  rangeLabel: string
  overview: ReportOverview
  insights: ReportInsight[]
  projectBreakdown: ReportBreakdownItem[]
  tagBreakdown: ReportBreakdownItem[]
  projectTagMatrix: ReportProjectTagMatrix
  dailyRollups: ReportRollup[]
  weeklyRollups: ReportWeekRollup[]
  sessionGroups: ReportSessionGroup[]
}

export interface PublicReport {
  token: string
  title: string
  summary: string
  publishedAtIso: string
  snapshot: ReportSnapshot
}

interface ReportRange {
  start: Date
  end: Date
}

interface ReportTimeZoneParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

interface ReportClampedSession {
  sessionId: string
  projectId: string
  projectName: string
  tagIds: string[]
  tagNames: string[]
  notes: string
  originalStartTime: Date
  originalEndTime: Date
  clampedStartTime: Date
  clampedEndTime: Date
  durationMinutes: number
}

const REPORT_DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>()

const getReportDateFormatter = (timeZone: string, options: Intl.DateTimeFormatOptions) => {
  const cacheKey = `${timeZone}:${JSON.stringify(options)}`
  const existing = REPORT_DATE_FORMATTER_CACHE.get(cacheKey)

  if (existing) {
    return existing
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    calendar: 'iso8601',
    hourCycle: 'h23',
    ...options,
    timeZone,
  })

  REPORT_DATE_FORMATTER_CACHE.set(cacheKey, formatter)

  return formatter
}

const getTimeZoneParts = (date: Date, timeZone: string): ReportTimeZoneParts => {
  const formatter = getReportDateFormatter(timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return formatter.formatToParts(date).reduce<ReportTimeZoneParts>(
    (parts, part) => {
      if (part.type === 'year') parts.year = Number(part.value)
      if (part.type === 'month') parts.month = Number(part.value)
      if (part.type === 'day') parts.day = Number(part.value)
      if (part.type === 'hour') parts.hour = Number(part.value)
      if (part.type === 'minute') parts.minute = Number(part.value)
      if (part.type === 'second') parts.second = Number(part.value)

      return parts
    },
    {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
    },
  )
}

const getTimeZoneOffsetMilliseconds = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone)
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return utcEquivalent - date.valueOf()
}

const buildDisplayDateFromDateKey = (dateKey: string) => {
  const parsed = parseDateKey(dateKey)

  if (!parsed) {
    return new Date(Date.UTC(1970, 0, 1, 12, 0, 0, 0))
  }

  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0))
}

export const getTimeZoneDateKey = (date: Date, timeZone: string) => {
  const { year, month, day } = getTimeZoneParts(date, timeZone)

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const formatReportDateLabel = (dateKey: string, _timeZone: string) =>
  buildDisplayDateFromDateKey(dateKey).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const getTimeZoneStartOfDay = (dateKey: string, timeZone: string) => {
  const parsed = parseDateKey(dateKey)

  if (!parsed) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  const utcGuess = new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0),
  )
  const firstOffset = getTimeZoneOffsetMilliseconds(utcGuess, timeZone)
  const firstPass = new Date(utcGuess.valueOf() - firstOffset)
  const secondOffset = getTimeZoneOffsetMilliseconds(firstPass, timeZone)

  return new Date(utcGuess.valueOf() - secondOffset)
}

export const getReportRange = (filters: ReportFilter, timeZone: string): ReportRange => ({
  start: getTimeZoneStartOfDay(filters.dateStart, timeZone),
  end: getTimeZoneStartOfDay(
    formatDateKey(addDays(parseDateKey(filters.dateEnd) ?? new Date(), 1)),
    timeZone,
  ),
})

const getReportRangeLabel = (filters: ReportFilter, timeZone: string) => {
  const startLabel = formatReportDateLabel(filters.dateStart, timeZone)
  const endLabel = formatReportDateLabel(filters.dateEnd, timeZone)

  return filters.dateStart === filters.dateEnd ? startLabel : `${startLabel} - ${endLabel}`
}

const getNamedEntityMap = (values: NamedEntity[]) =>
  new Map(values.map((value) => [value.id, value.name]))

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

const toHours = (minutes: number) => roundToOneDecimal(minutes / 60)

const matchesProjectFilter = (timeBox: TimeBox, filters: ReportFilter) => {
  if (filters.projectIds.length === 0) {
    return true
  }

  return filters.projectIds.includes(timeBox.project)
}

const matchesTagFilter = (timeBox: TimeBox, filters: ReportFilter) => {
  if (filters.tagIds.length === 0) {
    return true
  }

  if (filters.tagOperator === 'all') {
    return filters.tagIds.every((tagId) => timeBox.tags.includes(tagId))
  }

  return filters.tagIds.some((tagId) => timeBox.tags.includes(tagId))
}

export const matchesReportFilter = (timeBox: TimeBox, filters: ReportFilter) => {
  const hasProjectFilter = filters.projectIds.length > 0
  const hasTagFilter = filters.tagIds.length > 0

  if (!hasProjectFilter && !hasTagFilter) {
    return true
  }

  const projectMatch = matchesProjectFilter(timeBox, filters)
  const tagMatch = matchesTagFilter(timeBox, filters)

  if (hasProjectFilter && hasTagFilter) {
    return filters.groupOperator === 'intersection'
      ? projectMatch && tagMatch
      : projectMatch || tagMatch
  }

  return hasProjectFilter ? projectMatch : tagMatch
}

const clampDate = (date: Date, minDate: Date, maxDate: Date) =>
  new Date(Math.min(Math.max(date.valueOf(), minDate.valueOf()), maxDate.valueOf()))

const createClampedSession = ({
  timeBox,
  range,
  projectNameById,
  tagNameById,
}: {
  timeBox: TimeBox
  range: ReportRange
  projectNameById: Map<string, string>
  tagNameById: Map<string, string>
}): ReportClampedSession | null => {
  if (!timeBox.startTime || !timeBox.endTime) {
    return null
  }

  if (
    timeBox.startTime.valueOf() >= range.end.valueOf() ||
    timeBox.endTime.valueOf() <= range.start.valueOf()
  ) {
    return null
  }

  const clampedStartTime = clampDate(timeBox.startTime, range.start, range.end)
  const clampedEndTime = clampDate(timeBox.endTime, range.start, range.end)
  const durationMinutes = (clampedEndTime.valueOf() - clampedStartTime.valueOf()) / 60_000

  if (durationMinutes <= 0) {
    return null
  }

  return {
    sessionId: timeBox.id,
    projectId: timeBox.project,
    projectName: projectNameById.get(timeBox.project) ?? 'Unknown project',
    tagIds: [...timeBox.tags],
    tagNames: timeBox.tags.map((tagId) => tagNameById.get(tagId) ?? 'Unknown tag'),
    notes: timeBox.notes,
    originalStartTime: timeBox.startTime,
    originalEndTime: timeBox.endTime,
    clampedStartTime,
    clampedEndTime,
    durationMinutes,
  }
}

const splitClampedSessionByDay = (session: ReportClampedSession, timeZone: string) => {
  const segments: Array<{ dateKey: string; minutes: number }> = []
  let cursor = new Date(session.clampedStartTime.valueOf())

  while (cursor.valueOf() < session.clampedEndTime.valueOf()) {
    const dateKey = getTimeZoneDateKey(cursor, timeZone)
    const nextDayStart = getTimeZoneStartOfDay(
      formatDateKey(addDays(parseDateKey(dateKey) ?? new Date(), 1)),
      timeZone,
    )
    const segmentEnd =
      nextDayStart.valueOf() < session.clampedEndTime.valueOf()
        ? nextDayStart
        : session.clampedEndTime
    const minutes = (segmentEnd.valueOf() - cursor.valueOf()) / 60_000

    segments.push({ dateKey, minutes })
    cursor = segmentEnd
  }

  return segments
}

export const groupReportSessionRows = (
  rows: ReportSessionRow[],
  timeZone: string,
): ReportSessionGroup[] => {
  const groups = new Map<string, ReportSessionGroup>()

  rows.forEach((row) => {
    const dateKey = row.dateKey
    const existing = groups.get(dateKey) ?? {
      dateKey,
      label: formatReportDateLabel(dateKey, timeZone),
      totalMinutes: 0,
      totalHours: 0,
      sessionCount: 0,
      sessions: [],
    }

    existing.totalMinutes += row.durationMinutes
    existing.totalHours = toHours(existing.totalMinutes)
    existing.sessionCount += 1
    existing.sessions.push(row)
    groups.set(dateKey, existing)
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      sessions: group.sessions.sort((left, right) =>
        left.clampedStartTimeIso.localeCompare(right.clampedStartTimeIso),
      ),
    }))
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
}

const buildSessionGroups = (
  sessions: ReportClampedSession[],
  timeZone: string,
): ReportSessionGroup[] =>
  groupReportSessionRows(
    sessions.map((session) => ({
      sessionId: session.sessionId,
      dateKey: getTimeZoneDateKey(session.clampedStartTime, timeZone),
      projectId: session.projectId,
      projectName: session.projectName,
      tagIds: [...session.tagIds],
      tagNames: [...session.tagNames],
      notes: session.notes,
      durationMinutes: session.durationMinutes,
      startTimeIso: session.originalStartTime.toISOString(),
      endTimeIso: session.originalEndTime.toISOString(),
      clampedStartTimeIso: session.clampedStartTime.toISOString(),
      clampedEndTimeIso: session.clampedEndTime.toISOString(),
    })),
    timeZone,
  )

const buildBreakdown = ({
  totals,
  sessionCounts,
  totalMinutes,
}: {
  totals: Map<string, { label: string; minutes: number }>
  sessionCounts: Map<string, number>
  totalMinutes: number
}) =>
  [...totals.entries()]
    .map(([id, entry]) => ({
      id,
      label: entry.label,
      minutes: entry.minutes,
      hours: toHours(entry.minutes),
      percentageOfTotal:
        totalMinutes > 0 ? roundToOneDecimal((entry.minutes / totalMinutes) * 100) : 0,
      sessionCount: sessionCounts.get(id) ?? 0,
    }))
    .sort((left, right) => right.minutes - left.minutes || left.label.localeCompare(right.label))

const buildProjectTagMatrix = ({
  projectTotals,
  tagTotals,
  matrixTotals,
}: {
  projectTotals: Map<string, { label: string; minutes: number }>
  tagTotals: Map<string, { label: string; minutes: number }>
  matrixTotals: Map<string, number>
}): ReportProjectTagMatrix => {
  const columns = [...tagTotals.entries()]
    .map(([tagId, entry]) => ({
      tagId,
      tagName: entry.label,
      minutes: entry.minutes,
      hours: toHours(entry.minutes),
    }))
    .sort(
      (left, right) => right.minutes - left.minutes || left.tagName.localeCompare(right.tagName),
    )

  const rows = [...projectTotals.entries()]
    .map(([projectId, projectEntry]) => ({
      projectId,
      projectName: projectEntry.label,
      minutes: projectEntry.minutes,
      hours: toHours(projectEntry.minutes),
      cells: columns.map((column) => {
        const matrixKey = `${projectId}::${column.tagId}`
        const minutes = matrixTotals.get(matrixKey) ?? 0

        return {
          tagId: column.tagId,
          tagName: column.tagName,
          minutes,
          hours: toHours(minutes),
        }
      }),
    }))
    .sort(
      (left, right) =>
        right.minutes - left.minutes || left.projectName.localeCompare(right.projectName),
    )

  return { columns, rows }
}

const buildDailyRollups = (sessions: ReportClampedSession[], timeZone: string): ReportRollup[] => {
  const totals = new Map<string, { minutes: number; sessionCount: number }>()

  sessions.forEach((session) => {
    splitClampedSessionByDay(session, timeZone).forEach((segment) => {
      const existing = totals.get(segment.dateKey) ?? { minutes: 0, sessionCount: 0 }

      existing.minutes += segment.minutes
      existing.sessionCount += 1
      totals.set(segment.dateKey, existing)
    })
  })

  return [...totals.entries()]
    .map(([dateKey, entry]) => ({
      dateKey,
      label: formatReportDateLabel(dateKey, timeZone),
      minutes: entry.minutes,
      hours: toHours(entry.minutes),
      sessionCount: entry.sessionCount,
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
}

const buildWeeklyRollups = (dailyRollups: ReportRollup[]): ReportWeekRollup[] => {
  const totals = new Map<
    string,
    { minutes: number; sessionCount: number; weekEndDateKey: string }
  >()

  dailyRollups.forEach((rollup) => {
    const date = parseDateKey(rollup.dateKey)

    if (!date) {
      return
    }

    const weekStart = formatDateKey(getStartOfWeek(date))
    const weekEnd = formatDateKey(addDays(parseDateKey(weekStart) ?? date, 6))
    const existing = totals.get(weekStart) ?? {
      minutes: 0,
      sessionCount: 0,
      weekEndDateKey: weekEnd,
    }

    existing.minutes += rollup.minutes
    existing.sessionCount += rollup.sessionCount
    existing.weekEndDateKey = weekEnd
    totals.set(weekStart, existing)
  })

  return [...totals.entries()]
    .map(([weekStartDateKey, entry]) => ({
      weekStartDateKey,
      weekEndDateKey: entry.weekEndDateKey,
      label: `${formatReportDateLabel(weekStartDateKey, 'UTC')} - ${formatReportDateLabel(entry.weekEndDateKey, 'UTC')}`,
      minutes: entry.minutes,
      hours: toHours(entry.minutes),
      sessionCount: entry.sessionCount,
    }))
    .sort((left, right) => left.weekStartDateKey.localeCompare(right.weekStartDateKey))
}

const buildInsights = ({
  dailyRollups,
  longestSession,
  projectBreakdown,
  tagBreakdown,
  contextSwitchCount,
}: {
  dailyRollups: ReportRollup[]
  longestSession: ReportClampedSession | null
  projectBreakdown: ReportBreakdownItem[]
  tagBreakdown: ReportBreakdownItem[]
  contextSwitchCount: number
}): ReportInsight[] => {
  const busiestDay = dailyRollups.at(-1)
  const mostActiveProject = projectBreakdown[0]
  const strongestTag = tagBreakdown[0]
  const insights: ReportInsight[] = []

  if (busiestDay) {
    insights.push({
      id: 'busiest-day',
      label: 'Busiest day',
      value: `${busiestDay.label} (${formatMinutesAsDecimalHours(busiestDay.minutes)} hrs)`,
    })
  }

  if (longestSession) {
    insights.push({
      id: 'longest-session',
      label: 'Longest session',
      value: `${longestSession.projectName} (${formatMinutesAsDecimalHours(longestSession.durationMinutes)} hrs)`,
    })
  }

  if (mostActiveProject) {
    insights.push({
      id: 'top-project',
      label: 'Most active project',
      value: `${mostActiveProject.label} (${formatMinutesAsDecimalHours(mostActiveProject.minutes)} hrs)`,
    })
  }

  if (strongestTag) {
    insights.push({
      id: 'top-tag',
      label: 'Top tag',
      value: `${strongestTag.label} (${formatMinutesAsDecimalHours(strongestTag.minutes)} hrs)`,
    })
  }

  insights.push({
    id: 'context-switches',
    label: 'Context switches',
    value: String(contextSwitchCount),
  })

  return insights
}

export const buildReportSnapshot = ({
  filters,
  timezone,
  projects,
  tags,
  timeBoxes,
  generatedAt = new Date(),
}: {
  filters: ReportFilter
  timezone: string
  projects: NamedEntity[]
  tags: NamedEntity[]
  timeBoxes: TimeBox[]
  generatedAt?: Date
}): ReportSnapshot => {
  const range = getReportRange(filters, timezone)
  const projectNameById = getNamedEntityMap(projects)
  const tagNameById = getNamedEntityMap(tags)
  const matchedSessions = timeBoxes
    .filter((timeBox) => matchesReportFilter(timeBox, filters))
    .map((timeBox) =>
      createClampedSession({
        timeBox,
        range,
        projectNameById,
        tagNameById,
      }),
    )
    .filter((session): session is ReportClampedSession => session !== null)
    .sort(
      (left, right) =>
        left.clampedStartTime.valueOf() - right.clampedStartTime.valueOf() ||
        left.clampedEndTime.valueOf() - right.clampedEndTime.valueOf(),
    )

  const totalMinutes = matchedSessions.reduce((sum, session) => sum + session.durationMinutes, 0)
  const projectTotals = new Map<string, { label: string; minutes: number }>()
  const projectSessionCounts = new Map<string, number>()
  const tagTotals = new Map<string, { label: string; minutes: number }>()
  const tagSessionCounts = new Map<string, number>()
  const matrixTotals = new Map<string, number>()

  matchedSessions.forEach((session) => {
    const projectEntry = projectTotals.get(session.projectId) ?? {
      label: session.projectName,
      minutes: 0,
    }

    projectEntry.minutes += session.durationMinutes
    projectTotals.set(session.projectId, projectEntry)
    projectSessionCounts.set(
      session.projectId,
      (projectSessionCounts.get(session.projectId) ?? 0) + 1,
    )

    const sessionTagIds = session.tagIds.length > 0 ? session.tagIds : ['']
    const sessionTagNames = session.tagNames.length > 0 ? session.tagNames : ['Untyped']
    const minutesPerTag = session.durationMinutes / sessionTagIds.length

    sessionTagIds.forEach((tagId, index) => {
      const tagName = sessionTagNames[index] ?? 'Untyped'
      const tagEntry = tagTotals.get(tagId) ?? { label: tagName, minutes: 0 }
      tagEntry.minutes += minutesPerTag
      tagTotals.set(tagId, tagEntry)
      tagSessionCounts.set(tagId, (tagSessionCounts.get(tagId) ?? 0) + 1)

      const matrixKey = `${session.projectId}::${tagId}`
      matrixTotals.set(matrixKey, (matrixTotals.get(matrixKey) ?? 0) + minutesPerTag)
    })
  })

  const projectBreakdown = buildBreakdown({
    totals: projectTotals,
    sessionCounts: projectSessionCounts,
    totalMinutes,
  })
  const tagBreakdown = buildBreakdown({
    totals: tagTotals,
    sessionCounts: tagSessionCounts,
    totalMinutes,
  })
  const dailyRollups = buildDailyRollups(matchedSessions, timezone)
  const weeklyRollups = buildWeeklyRollups(dailyRollups)
  const sessionGroups = buildSessionGroups(matchedSessions, timezone)
  const busiestDay = dailyRollups.reduce<ReportRollup | null>(
    (best, current) => (best === null || current.minutes > best.minutes ? current : best),
    null,
  )
  const longestSession = matchedSessions.reduce<ReportClampedSession | null>(
    (best, current) =>
      best === null || current.durationMinutes > best.durationMinutes ? current : best,
    null,
  )
  const contextSwitchCount = matchedSessions.reduce((count, session, index) => {
    if (index === 0) {
      return count
    }

    return matchedSessions[index - 1]?.projectId !== session.projectId ? count + 1 : count
  }, 0)
  const firstLoggedDay = dailyRollups[0]
  const lastLoggedDay = dailyRollups.at(-1)
  const overview: ReportOverview = {
    totalMinutes,
    totalHours: toHours(totalMinutes),
    sessionCount: matchedSessions.length,
    activeDayCount: dailyRollups.length,
    averageMinutesPerActiveDay: dailyRollups.length > 0 ? totalMinutes / dailyRollups.length : 0,
    averageSessionMinutes: matchedSessions.length > 0 ? totalMinutes / matchedSessions.length : 0,
    busiestDayDateKey: busiestDay?.dateKey ?? '',
    busiestDayLabel: busiestDay?.label ?? '',
    busiestDayMinutes: busiestDay?.minutes ?? 0,
    longestSessionId: longestSession?.sessionId ?? '',
    longestSessionMinutes: longestSession?.durationMinutes ?? 0,
    longestSessionProjectName: longestSession?.projectName ?? '',
    firstLoggedDayDateKey: firstLoggedDay?.dateKey ?? '',
    firstLoggedDayLabel: firstLoggedDay?.label ?? '',
    lastLoggedDayDateKey: lastLoggedDay?.dateKey ?? '',
    lastLoggedDayLabel: lastLoggedDay?.label ?? '',
    contextSwitchCount,
    metrics: [
      {
        label: 'Total hours',
        value: formatMinutesAsDecimalHours(totalMinutes),
      },
      {
        label: 'Sessions',
        value: String(matchedSessions.length),
      },
      {
        label: 'Active days',
        value: String(dailyRollups.length),
      },
      {
        label: 'Avg hours / active day',
        value: formatMinutesAsDecimalHours(
          dailyRollups.length > 0 ? totalMinutes / dailyRollups.length : 0,
        ),
      },
      {
        label: 'Avg session length',
        value: formatMinutesAsDecimalHours(
          matchedSessions.length > 0 ? totalMinutes / matchedSessions.length : 0,
        ),
      },
      {
        label: 'Context switches',
        value: String(contextSwitchCount),
      },
    ],
  }

  return {
    generatedAtIso: generatedAt.toISOString(),
    timezone,
    rangeStartDateKey: filters.dateStart,
    rangeEndDateKey: filters.dateEnd,
    rangeLabel: getReportRangeLabel(filters, timezone),
    overview,
    insights: buildInsights({
      dailyRollups,
      longestSession,
      projectBreakdown,
      tagBreakdown,
      contextSwitchCount,
    }),
    projectBreakdown,
    tagBreakdown,
    projectTagMatrix: buildProjectTagMatrix({
      projectTotals,
      tagTotals,
      matrixTotals,
    }),
    dailyRollups,
    weeklyRollups,
    sessionGroups,
  }
}

export const createDefaultReportInput = (today = new Date(), timezone = 'UTC'): ReportInput => {
  const todayDateKey = getTimeZoneDateKey(today, timezone)
  const todayDate = parseDateKey(todayDateKey) ?? today
  const monthStartDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

  return {
    title: 'Client Report',
    summary: '',
    timezone,
    filters: {
      dateStart: formatDateKey(monthStartDate),
      dateEnd: todayDateKey,
      projectIds: [],
      tagIds: [],
      groupOperator: 'intersection',
      tagOperator: 'any',
    },
  }
}
