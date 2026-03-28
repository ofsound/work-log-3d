import { randomBytes } from 'node:crypto'

import {
  buildReportSnapshot,
  getReportRange,
  groupReportSessionRows,
  reportFiltersWithAllTagsInScope,
} from '~~/shared/worklog'

import type {
  NamedEntity,
  PublicReport,
  Report,
  ReportSessionRow,
  ReportSnapshot,
  TimeBox,
} from '~~/shared/worklog'

export class PublicReportError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'PublicReportError'
  }
}

export interface StoredPublicReportRecord {
  token: string
  title: string
  summary: string
  publishedAtIso: string
  snapshot: Omit<ReportSnapshot, 'sessionGroups'>
  sessionRows: ReportSessionRow[]
}

export interface PublishDraftDependencies {
  getReport(uid: string, reportId: string): Promise<Report | null>
  getProjects(uid: string): Promise<NamedEntity[]>
  getTags(uid: string): Promise<NamedEntity[]>
  getTimeBoxes(uid: string, range: { start: Date; end: Date }): Promise<TimeBox[]>
  savePublishedReport(input: {
    uid: string
    reportId: string
    token: string
    title: string
    summary: string
    publishedAt: Date
    snapshot: Omit<ReportSnapshot, 'sessionGroups'>
    sessionRows: ReportSessionRow[]
  }): Promise<void>
  updateReportPublishState(input: {
    uid: string
    reportId: string
    shareToken: string
    publishedAt: Date | null
  }): Promise<void>
  deletePublishedReport(token: string): Promise<void>
  getPublishedReport(token: string): Promise<StoredPublicReportRecord | null>
  now?: () => Date
  generateToken?: () => string
}

const createToken = () => randomBytes(16).toString('hex')

export const publishReportDraft = async (
  dependencies: PublishDraftDependencies,
  { uid, reportId }: { uid: string; reportId: string },
): Promise<PublicReport> => {
  const report = await dependencies.getReport(uid, reportId)

  if (!report) {
    throw new PublicReportError(404, 'Report not found.')
  }

  const range = getReportRange(report.filters)
  const [projects, tags, timeBoxes] = await Promise.all([
    dependencies.getProjects(uid),
    dependencies.getTags(uid),
    dependencies.getTimeBoxes(uid, range),
  ])
  const snapshot = buildReportSnapshot({
    filters: reportFiltersWithAllTagsInScope(report.filters),
    projects,
    tags,
    timeBoxes,
    generatedAt: dependencies.now ? dependencies.now() : new Date(),
  })
  const publishedAt = dependencies.now ? dependencies.now() : new Date()
  const token =
    report.shareToken || (dependencies.generateToken ? dependencies.generateToken() : createToken())
  const { sessionGroups, ...snapshotBase } = snapshot

  await dependencies.savePublishedReport({
    uid,
    reportId,
    token,
    title: report.title,
    summary: report.summary,
    publishedAt,
    snapshot: snapshotBase,
    sessionRows: sessionGroups.flatMap((group) => group.sessions),
  })
  await dependencies.updateReportPublishState({
    uid,
    reportId,
    shareToken: token,
    publishedAt,
  })

  return {
    token,
    title: report.title,
    summary: report.summary,
    publishedAtIso: publishedAt.toISOString(),
    snapshot,
  }
}

export const unpublishReportDraft = async (
  dependencies: PublishDraftDependencies,
  { uid, reportId }: { uid: string; reportId: string },
) => {
  const report = await dependencies.getReport(uid, reportId)

  if (!report) {
    throw new PublicReportError(404, 'Report not found.')
  }

  if (report.shareToken) {
    await dependencies.deletePublishedReport(report.shareToken)
  }

  await dependencies.updateReportPublishState({
    uid,
    reportId,
    shareToken: report.shareToken,
    publishedAt: null,
  })
}

export const getPublishedReportByToken = async (
  dependencies: Pick<PublishDraftDependencies, 'getPublishedReport'>,
  token: string,
): Promise<PublicReport> => {
  const record = await dependencies.getPublishedReport(token)

  if (!record) {
    throw new PublicReportError(404, 'Report not found.')
  }

  return {
    token: record.token,
    title: record.title,
    summary: record.summary,
    publishedAtIso: record.publishedAtIso,
    snapshot: {
      ...record.snapshot,
      sessionGroups: groupReportSessionRows(record.sessionRows),
    },
  }
}
