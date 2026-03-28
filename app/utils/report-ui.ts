import { createDefaultReportInput, formatDurationLabel } from '~~/shared/worklog'

import type { ReportInput } from '~~/shared/worklog'

export const cloneReportInput = (input: ReportInput): ReportInput => ({
  title: input.title,
  summary: input.summary,
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
  createDefaultReportInput(today)

export const formatReportHours = (minutes: number) => formatDurationLabel(minutes, 'hours-decimal')

const reportDisplayTimeZone = 'UTC'

export const formatReportDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    timeZone: reportDisplayTimeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const formatReportTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', {
    timeZone: reportDisplayTimeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
