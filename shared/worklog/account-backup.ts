export const WORK_LOG_BACKUP_FORMAT = 'work-log-backup'
export const WORK_LOG_BACKUP_FORMAT_VERSION = 1
export const WORK_LOG_BACKUP_COLLECTION_IDS = [
  'projects',
  'tags',
  'timeBoxes',
  'dailyNotes',
  'reports',
  'settings',
  'runtime',
] as const

export type WorkLogBackupCollectionId = (typeof WORK_LOG_BACKUP_COLLECTION_IDS)[number]

export type WorkLogBackupValue =
  | null
  | boolean
  | number
  | string
  | WorkLogBackupValue[]
  | WorkLogBackupObject

export interface WorkLogBackupObject {
  [key: string]: WorkLogBackupValue
}

export interface WorkLogBackupDocument {
  id: string
  data: WorkLogBackupObject
}

export interface WorkLogBackupPublicReport {
  document: WorkLogBackupDocument
  sessionRows: WorkLogBackupDocument[]
}

export type WorkLogBackupCollections = Record<WorkLogBackupCollectionId, WorkLogBackupDocument[]>

export interface WorkLogBackupV1 {
  format: typeof WORK_LOG_BACKUP_FORMAT
  formatVersion: typeof WORK_LOG_BACKUP_FORMAT_VERSION
  exportedAt: string
  appVersion: string
  account: {
    sourceUserId: string
    email: string | null
    displayName: string | null
    photoUrl: string | null
  }
  manifest: {
    consistency: 'best-effort'
    documentCount: number
    collectionDocumentCounts: Record<WorkLogBackupCollectionId, number>
    publicReportCount: number
    publicReportSessionRowCount: number
  }
  data: {
    userDocument: WorkLogBackupDocument | null
    collections: WorkLogBackupCollections
    publicReports: WorkLogBackupPublicReport[]
  }
}

export interface CreateWorkLogBackupInput {
  exportedAt: Date
  appVersion: string
  account: WorkLogBackupV1['account']
  userDocument: WorkLogBackupDocument | null
  collections: WorkLogBackupCollections
  publicReports: WorkLogBackupPublicReport[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isBackupDocument = (value: unknown): value is WorkLogBackupDocument =>
  isRecord(value) && typeof value.id === 'string' && value.id.length > 0 && isRecord(value.data)

export const createWorkLogBackup = ({
  exportedAt,
  appVersion,
  account,
  userDocument,
  collections,
  publicReports,
}: CreateWorkLogBackupInput): WorkLogBackupV1 => {
  const collectionDocumentCounts = Object.fromEntries(
    WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId) => [
      collectionId,
      collections[collectionId].length,
    ]),
  ) as Record<WorkLogBackupCollectionId, number>
  const collectionDocumentCount = Object.values(collectionDocumentCounts).reduce(
    (total, count) => total + count,
    0,
  )
  const publicReportSessionRowCount = publicReports.reduce(
    (total, report) => total + report.sessionRows.length,
    0,
  )

  return {
    format: WORK_LOG_BACKUP_FORMAT,
    formatVersion: WORK_LOG_BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    appVersion,
    account,
    manifest: {
      consistency: 'best-effort',
      documentCount:
        collectionDocumentCount +
        publicReports.length +
        publicReportSessionRowCount +
        (userDocument ? 1 : 0),
      collectionDocumentCounts,
      publicReportCount: publicReports.length,
      publicReportSessionRowCount,
    },
    data: {
      userDocument,
      collections,
      publicReports,
    },
  }
}

export const serializeWorkLogBackup = (backup: WorkLogBackupV1) =>
  `${JSON.stringify(backup, null, 2)}\n`

export const parseWorkLogBackup = (serialized: string): WorkLogBackupV1 => {
  const parsed: unknown = JSON.parse(serialized)

  if (
    !isRecord(parsed) ||
    parsed.format !== WORK_LOG_BACKUP_FORMAT ||
    parsed.formatVersion !== WORK_LOG_BACKUP_FORMAT_VERSION ||
    typeof parsed.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(parsed.exportedAt)) ||
    typeof parsed.appVersion !== 'string' ||
    !isRecord(parsed.account) ||
    typeof parsed.account.sourceUserId !== 'string' ||
    (parsed.account.email !== null && typeof parsed.account.email !== 'string') ||
    (parsed.account.displayName !== null && typeof parsed.account.displayName !== 'string') ||
    (parsed.account.photoUrl !== null && typeof parsed.account.photoUrl !== 'string') ||
    !isRecord(parsed.manifest) ||
    parsed.manifest.consistency !== 'best-effort' ||
    typeof parsed.manifest.documentCount !== 'number' ||
    !isRecord(parsed.manifest.collectionDocumentCounts) ||
    typeof parsed.manifest.publicReportCount !== 'number' ||
    typeof parsed.manifest.publicReportSessionRowCount !== 'number' ||
    !isRecord(parsed.data) ||
    (parsed.data.userDocument !== null && !isBackupDocument(parsed.data.userDocument)) ||
    !isRecord(parsed.data.collections) ||
    !Array.isArray(parsed.data.publicReports)
  ) {
    throw new Error('This is not a supported Work Log backup file.')
  }

  let collectionDocumentCount = 0

  for (const collectionId of WORK_LOG_BACKUP_COLLECTION_IDS) {
    const documents = parsed.data.collections[collectionId]
    const manifestCount = parsed.manifest.collectionDocumentCounts[collectionId]

    if (
      !Array.isArray(documents) ||
      !documents.every(isBackupDocument) ||
      typeof manifestCount !== 'number' ||
      !Number.isInteger(manifestCount) ||
      manifestCount !== documents.length
    ) {
      throw new Error('This Work Log backup file is incomplete or malformed.')
    }

    collectionDocumentCount += documents.length
  }

  let publicReportSessionRowCount = 0

  for (const report of parsed.data.publicReports) {
    if (
      !isRecord(report) ||
      !isBackupDocument(report.document) ||
      !Array.isArray(report.sessionRows) ||
      !report.sessionRows.every(isBackupDocument)
    ) {
      throw new Error('This Work Log backup file is incomplete or malformed.')
    }

    publicReportSessionRowCount += report.sessionRows.length
  }

  const expectedDocumentCount =
    collectionDocumentCount +
    parsed.data.publicReports.length +
    publicReportSessionRowCount +
    (parsed.data.userDocument === null ? 0 : 1)

  if (
    parsed.manifest.documentCount !== expectedDocumentCount ||
    parsed.manifest.publicReportCount !== parsed.data.publicReports.length ||
    parsed.manifest.publicReportSessionRowCount !== publicReportSessionRowCount
  ) {
    throw new Error('This Work Log backup file is incomplete or malformed.')
  }

  return parsed as unknown as WorkLogBackupV1
}
