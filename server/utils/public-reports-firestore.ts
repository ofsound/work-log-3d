import { FieldPath, Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from './firebase-admin'
import type { PublishDraftDependencies, StoredPublicReportRecord } from './public-reports'

import type { NamedEntity, Report, ReportSessionRow, TimeBox } from '~~/shared/worklog'

const PUBLIC_REPORTS_COLLECTION = 'publicReports'
const PUBLIC_REPORT_SESSION_ROWS_SUBCOLLECTION = 'sessionRows'

const toNamedEntity = (snapshot: FirebaseFirestore.QueryDocumentSnapshot): NamedEntity => {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    name: typeof data.name === 'string' ? data.name : '',
  }
}

const toTimeBox = (snapshot: FirebaseFirestore.QueryDocumentSnapshot): TimeBox => {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : null,
    endTime: data.endTime instanceof Timestamp ? data.endTime.toDate() : null,
    notes: typeof data.notes === 'string' ? data.notes : '',
    project: typeof data.project === 'string' ? data.project : '',
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  }
}

const toReport = (snapshot: FirebaseFirestore.DocumentSnapshot): Report | null => {
  const data = snapshot.data()

  if (!data) {
    return null
  }

  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    summary: typeof data.summary === 'string' ? data.summary : '',
    timezone: typeof data.timezone === 'string' ? data.timezone : 'UTC',
    filters: {
      dateStart: typeof data.filters?.dateStart === 'string' ? data.filters.dateStart : '',
      dateEnd: typeof data.filters?.dateEnd === 'string' ? data.filters.dateEnd : '',
      projectIds: Array.isArray(data.filters?.projectIds)
        ? data.filters.projectIds.filter(
            (projectId: unknown): projectId is string => typeof projectId === 'string',
          )
        : [],
      tagIds: Array.isArray(data.filters?.tagIds)
        ? data.filters.tagIds.filter((tagId: unknown): tagId is string => typeof tagId === 'string')
        : [],
      groupOperator: data.filters?.groupOperator === 'union' ? 'union' : 'intersection',
      tagOperator: data.filters?.tagOperator === 'all' ? 'all' : 'any',
    },
    shareToken: typeof data.shareToken === 'string' ? data.shareToken : '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
    publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : null,
  }
}

const toReportSessionRow = (
  snapshot: FirebaseFirestore.QueryDocumentSnapshot,
): ReportSessionRow => {
  const data = snapshot.data()

  return {
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : snapshot.id,
    dateKey: typeof data.dateKey === 'string' ? data.dateKey : '',
    projectId: typeof data.projectId === 'string' ? data.projectId : '',
    projectName: typeof data.projectName === 'string' ? data.projectName : '',
    tagIds: Array.isArray(data.tagIds)
      ? data.tagIds.filter((tagId): tagId is string => typeof tagId === 'string')
      : [],
    tagNames: Array.isArray(data.tagNames)
      ? data.tagNames.filter((tagName): tagName is string => typeof tagName === 'string')
      : [],
    notes: typeof data.notes === 'string' ? data.notes : '',
    durationMinutes: typeof data.durationMinutes === 'number' ? data.durationMinutes : 0,
    startTimeIso: typeof data.startTimeIso === 'string' ? data.startTimeIso : '',
    endTimeIso: typeof data.endTimeIso === 'string' ? data.endTimeIso : '',
    clampedStartTimeIso:
      typeof data.clampedStartTimeIso === 'string' ? data.clampedStartTimeIso : '',
    clampedEndTimeIso: typeof data.clampedEndTimeIso === 'string' ? data.clampedEndTimeIso : '',
  }
}

const clearSessionRows = async (token: string) => {
  const db = getAdminFirestore()
  const rowsSnapshot = await db
    .collection(PUBLIC_REPORTS_COLLECTION)
    .doc(token)
    .collection(PUBLIC_REPORT_SESSION_ROWS_SUBCOLLECTION)
    .get()

  if (rowsSnapshot.empty) {
    return
  }

  const batches = []

  for (let index = 0; index < rowsSnapshot.docs.length; index += 400) {
    const batch = db.batch()
    rowsSnapshot.docs.slice(index, index + 400).forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref)
    })
    batches.push(batch.commit())
  }

  await Promise.all(batches)
}

export const createFirestorePublishDependencies = (): PublishDraftDependencies => {
  const db = getAdminFirestore()

  return {
    async getReport(uid, reportId) {
      const snapshot = await db
        .collection('users')
        .doc(uid)
        .collection('reports')
        .doc(reportId)
        .get()

      return toReport(snapshot)
    },
    async getProjects(uid) {
      const snapshot = await db.collection('users').doc(uid).collection('projects').get()

      return snapshot.docs.map(toNamedEntity)
    },
    async getTags(uid) {
      const snapshot = await db.collection('users').doc(uid).collection('tags').get()

      return snapshot.docs.map(toNamedEntity)
    },
    async getTimeBoxes(uid, range) {
      const snapshot = await db
        .collection('users')
        .doc(uid)
        .collection('timeBoxes')
        .where('startTime', '<', Timestamp.fromDate(range.end))
        .where('endTime', '>', Timestamp.fromDate(range.start))
        .orderBy('startTime', 'asc')
        .orderBy('endTime', 'asc')
        .get()

      return snapshot.docs.map(toTimeBox)
    },
    async savePublishedReport({
      uid,
      reportId,
      token,
      title,
      summary,
      publishedAt,
      snapshot,
      sessionRows,
    }) {
      await clearSessionRows(token)

      await db
        .collection(PUBLIC_REPORTS_COLLECTION)
        .doc(token)
        .set({
          token,
          ownerId: uid,
          reportId,
          title,
          summary,
          publishedAt: Timestamp.fromDate(publishedAt),
          snapshot,
        })

      const rowWrites = sessionRows.map((row, index) =>
        db
          .collection(PUBLIC_REPORTS_COLLECTION)
          .doc(token)
          .collection(PUBLIC_REPORT_SESSION_ROWS_SUBCOLLECTION)
          .doc(`${String(index).padStart(5, '0')}-${row.sessionId}`)
          .set(row),
      )

      await Promise.all(rowWrites)
    },
    async updateReportPublishState({ uid, reportId, shareToken, publishedAt }) {
      await db
        .collection('users')
        .doc(uid)
        .collection('reports')
        .doc(reportId)
        .update({
          shareToken,
          publishedAt: publishedAt ? Timestamp.fromDate(publishedAt) : null,
          updatedAt: Timestamp.fromDate(new Date()),
        })
    },
    async deletePublishedReport(token) {
      if (!token) {
        return
      }

      await clearSessionRows(token)
      await db.collection(PUBLIC_REPORTS_COLLECTION).doc(token).delete()
    },
    async getPublishedReport(token): Promise<StoredPublicReportRecord | null> {
      const reportSnapshot = await db.collection(PUBLIC_REPORTS_COLLECTION).doc(token).get()
      const data = reportSnapshot.data()

      if (!data) {
        return null
      }

      const rowsSnapshot = await db
        .collection(PUBLIC_REPORTS_COLLECTION)
        .doc(token)
        .collection(PUBLIC_REPORT_SESSION_ROWS_SUBCOLLECTION)
        .orderBy(FieldPath.documentId())
        .get()

      return {
        token: typeof data.token === 'string' ? data.token : token,
        title: typeof data.title === 'string' ? data.title : '',
        summary: typeof data.summary === 'string' ? data.summary : '',
        publishedAtIso:
          data.publishedAt instanceof Timestamp ? data.publishedAt.toDate().toISOString() : '',
        snapshot: data.snapshot as StoredPublicReportRecord['snapshot'],
        sessionRows: rowsSnapshot.docs.map(toReportSessionRow),
      }
    },
  }
}
