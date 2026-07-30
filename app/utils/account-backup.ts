import { Bytes, DocumentReference, GeoPoint, Timestamp } from 'firebase/firestore'

import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import type {
  WorkLogBackupV1,
  WorkLogBackupDocument,
  WorkLogBackupObject,
  WorkLogBackupValue,
} from '~~/shared/worklog'
import { serializeWorkLogBackup } from '~~/shared/worklog'

const FIRESTORE_TYPE_KEY = '$firestoreType'

const taggedValue = (type: string, value: WorkLogBackupValue): WorkLogBackupObject => ({
  [FIRESTORE_TYPE_KEY]: type,
  value,
})

const encodeBytes = (value: Bytes | Uint8Array) => {
  if (value instanceof Bytes) {
    return value.toBase64()
  }

  let binary = ''

  value.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

export const encodeFirestoreBackupValue = (value: unknown): WorkLogBackupValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : taggedValue('number', String(value))
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

  if (value instanceof Bytes || value instanceof Uint8Array) {
    return {
      [FIRESTORE_TYPE_KEY]: 'bytes',
      encoding: 'base64',
      value: encodeBytes(value),
    }
  }

  if (Array.isArray(value)) {
    return value.map(encodeFirestoreBackupValue)
  }

  if (typeof value === 'object') {
    const encoded = Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encodeFirestoreBackupValue(entry)]),
    )

    return FIRESTORE_TYPE_KEY in encoded ? taggedValue('map', encoded) : encoded
  }

  throw new Error(`Unsupported Firestore backup value: ${typeof value}.`)
}

export const encodeFirestoreBackupDocument = (
  snapshot: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>,
): WorkLogBackupDocument | null => {
  const data = snapshot.data()

  return data
    ? {
        id: snapshot.id,
        data: encodeFirestoreBackupValue(data) as WorkLogBackupObject,
      }
    : null
}

export const getWorkLogBackupFileName = (exportedAt: string) =>
  `work-log-backup-${exportedAt.slice(0, 10)}.json`

export const downloadWorkLogBackup = (backup: WorkLogBackupV1) => {
  const blob = new Blob([serializeWorkLogBackup(backup)], {
    type: 'application/json;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = getWorkLogBackupFileName(backup.exportedAt)
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
