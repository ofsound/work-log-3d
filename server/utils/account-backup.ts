import { Buffer } from 'node:buffer'

import { DocumentReference, GeoPoint, Timestamp } from 'firebase-admin/firestore'

import { getAdminFirestore } from './firebase-admin'

import { WORK_LOG_BACKUP_COLLECTION_IDS, createWorkLogBackup } from '~~/shared/worklog'
import type {
  WorkLogBackupCollections,
  WorkLogBackupDocument,
  WorkLogBackupObject,
  WorkLogBackupPublicReport,
  WorkLogBackupValue,
  WorkLogBackupV1,
} from '~~/shared/worklog'

const FIRESTORE_TYPE_KEY = '$firestoreType'

const taggedValue = (type: string, value: WorkLogBackupValue): WorkLogBackupObject => ({
  [FIRESTORE_TYPE_KEY]: type,
  value,
})

export const encodeFirestoreBackupValue = (value: unknown): WorkLogBackupValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value
    }

    return taggedValue('number', String(value))
  }

  if (value instanceof Timestamp) {
    return taggedValue('timestamp', value.toDate().toISOString())
  }

  if (value instanceof Date) {
    return taggedValue('timestamp', value.toISOString())
  }

  if (value instanceof GeoPoint) {
    return {
      [FIRESTORE_TYPE_KEY]: 'geoPoint',
      latitude: value.latitude,
      longitude: value.longitude,
    }
  }

  if (value instanceof DocumentReference) {
    return taggedValue('reference', value.path)
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      [FIRESTORE_TYPE_KEY]: 'bytes',
      encoding: 'base64',
      value: Buffer.from(value).toString('base64'),
    }
  }

  if (Array.isArray(value)) {
    return value.map(encodeFirestoreBackupValue)
  }

  if (typeof value === 'object') {
    const encoded = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encodeFirestoreBackupValue(entry)]),
    )

    if (FIRESTORE_TYPE_KEY in encoded) {
      return taggedValue('map', encoded)
    }

    return encoded
  }

  throw new Error(`Unsupported Firestore backup value: ${typeof value}.`)
}

const encodeDocument = (
  snapshot: FirebaseFirestore.DocumentSnapshot,
): WorkLogBackupDocument | null => {
  const data = snapshot.data()

  if (!data) {
    return null
  }

  return {
    id: snapshot.id,
    data: encodeFirestoreBackupValue(data) as WorkLogBackupObject,
  }
}

export const createAccountBackup = async ({
  uid,
  email,
  displayName,
  photoUrl,
  appVersion,
  exportedAt = new Date(),
}: {
  uid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  appVersion: string
  exportedAt?: Date
}): Promise<WorkLogBackupV1> => {
  const db = getAdminFirestore()
  const userReference = db.collection('users').doc(uid)
  const [userSnapshot, publicReportsSnapshot, ...collectionSnapshots] = await Promise.all([
    userReference.get(),
    db.collection('publicReports').where('ownerId', '==', uid).get(),
    ...WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId) =>
      userReference.collection(collectionId).get(),
    ),
  ])
  const collections = Object.fromEntries(
    WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId, index) => [
      collectionId,
      collectionSnapshots[index]!.docs.map(encodeDocument)
        .filter((document): document is WorkLogBackupDocument => document !== null)
        .sort((left, right) => left.id.localeCompare(right.id)),
    ]),
  ) as WorkLogBackupCollections
  const publicReports = await Promise.all(
    publicReportsSnapshot.docs.map(async (reportSnapshot): Promise<WorkLogBackupPublicReport> => {
      const sessionRowsSnapshot = await reportSnapshot.ref.collection('sessionRows').get()
      const document = encodeDocument(reportSnapshot)

      if (!document) {
        throw new Error(`Published report ${reportSnapshot.id} has no data.`)
      }

      return {
        document,
        sessionRows: sessionRowsSnapshot.docs
          .map(encodeDocument)
          .filter((row): row is WorkLogBackupDocument => row !== null)
          .sort((left, right) => left.id.localeCompare(right.id)),
      }
    }),
  )

  publicReports.sort((left, right) => left.document.id.localeCompare(right.document.id))

  return createWorkLogBackup({
    exportedAt,
    appVersion,
    account: {
      sourceUserId: uid,
      email,
      displayName,
      photoUrl,
    },
    userDocument: encodeDocument(userSnapshot),
    collections,
    publicReports,
  })
}
