import {
  addDays,
  createDefaultReportInput,
  formatDateKey,
  formatMinutesAsDecimalHours,
  getStartOfWeek,
  getTimeZoneDateKey,
  parseDateKey,
} from '~~/shared/worklog'

import type { ReportInput } from '~~/shared/worklog'

export interface ReportDatePreset {
  id: string
  label: string
  dateStart: string
  dateEnd: string
}

export const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export const cloneReportInput = (input: ReportInput): ReportInput => ({
  title: input.title,
  summary: input.summary,
  timezone: input.timezone,
  filters: {
    dateStart: input.filters.dateStart,
    dateEnd: input.filters.dateEnd,
    projectIds: [...input.filters.projectIds],
    tagIds: [...input.filters.tagIds],
    groupOperator: input.filters.groupOperator,
    tagOperator: input.filters.tagOperator,
  },
})

export const createDefaultBrowserReportInput = (today = new Date()) =>
  createDefaultReportInput(today, getBrowserTimeZone())

export const buildReportDatePresets = (today = new Date(), timezone = getBrowserTimeZone()) => {
  const todayKey = getTimeZoneDateKey(today, timezone)
  const todayDate = parseDateKey(todayKey) ?? today
  const startOfThisWeek = getStartOfWeek(todayDate)
  const startOfLastWeek = addDays(startOfThisWeek, -7)
  const endOfLastWeek = addDays(startOfThisWeek, -1)
  const startOfThisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  const startOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1)
  const endOfLastMonth = addDays(startOfThisMonth, -1)

  return [
    {
      id: 'this-week',
      label: 'This week',
      dateStart: formatDateKey(startOfThisWeek),
      dateEnd: todayKey,
    },
    {
      id: 'last-week',
      label: 'Last week',
      dateStart: formatDateKey(startOfLastWeek),
      dateEnd: formatDateKey(endOfLastWeek),
    },
    {
      id: 'this-month',
      label: 'This month',
      dateStart: formatDateKey(startOfThisMonth),
      dateEnd: todayKey,
    },
    {
      id: 'last-month',
      label: 'Last month',
      dateStart: formatDateKey(startOfLastMonth),
      dateEnd: formatDateKey(endOfLastMonth),
    },
    {
      id: 'last-30-days',
      label: 'Last 30 days',
      dateStart: formatDateKey(addDays(todayDate, -29)),
      dateEnd: todayKey,
    },
  ] satisfies ReportDatePreset[]
}

export const formatReportHours = (minutes: number) => `${formatMinutesAsDecimalHours(minutes)} hrs`

export const formatReportDateTime = (iso: string, timezone: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const formatReportTime = (iso: string, timezone: string) =>
  new Date(iso).toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  })
