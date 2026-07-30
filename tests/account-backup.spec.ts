import { Bytes, GeoPoint, Timestamp } from 'firebase/firestore'

import { encodeFirestoreBackupValue, getWorkLogBackupFileName } from '~/app/utils/account-backup'
import {
  WORK_LOG_BACKUP_COLLECTION_IDS,
  createWorkLogBackup,
  parseWorkLogBackup,
  serializeWorkLogBackup,
} from '~~/shared/worklog'
import type { WorkLogBackupCollections } from '~~/shared/worklog'

const createEmptyCollections = (): WorkLogBackupCollections =>
  Object.fromEntries(
    WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId) => [collectionId, []]),
  ) as WorkLogBackupCollections

describe('account backup', () => {
  it('serializes and parses a versioned backup while preserving document ids and counts', () => {
    const collections = createEmptyCollections()

    collections.projects.push({
      id: 'project-1',
      data: {
        name: 'Design',
        archived: false,
      },
    })
    collections.timeBoxes.push({
      id: 'session-1',
      data: {
        project: 'project-1',
        startTime: {
          $firestoreType: 'timestamp',
          value: '2026-07-29T15:00:00.000Z',
        },
      },
    })

    const backup = createWorkLogBackup({
      exportedAt: new Date('2026-07-29T21:26:17.000Z'),
      appVersion: '0.2.0',
      account: {
        sourceUserId: 'user-1',
        email: 'casey@example.com',
        displayName: 'Casey',
        photoUrl: null,
      },
      userDocument: null,
      collections,
      publicReports: [
        {
          document: {
            id: 'public-report-1',
            data: {
              title: 'Weekly report',
            },
          },
          sessionRows: [
            {
              id: '00000-session-1',
              data: {
                sessionId: 'session-1',
              },
            },
          ],
        },
      ],
      publicReportSnapshots: 'complete',
    })
    const parsed = parseWorkLogBackup(serializeWorkLogBackup(backup))

    expect(parsed).toEqual(backup)
    expect(parsed.manifest.documentCount).toBe(4)
    expect(parsed.manifest.collectionDocumentCounts.timeBoxes).toBe(1)
    expect(parsed.manifest.publicReportCount).toBe(1)
    expect(parsed.manifest.publicReportSessionRowCount).toBe(1)
    expect(parsed.manifest.publicReportSnapshots).toBe('complete')
    expect(getWorkLogBackupFileName(parsed.exportedAt)).toBe('work-log-backup-2026-07-29.json')
  })

  it('rejects a backup when its manifest counts do not match its documents', () => {
    const backup = createWorkLogBackup({
      exportedAt: new Date('2026-07-29T21:26:17.000Z'),
      appVersion: '0.2.0',
      account: {
        sourceUserId: 'user-1',
        email: null,
        displayName: null,
        photoUrl: null,
      },
      userDocument: null,
      collections: createEmptyCollections(),
      publicReports: [],
      publicReportSnapshots: 'unavailable',
    })

    backup.manifest.documentCount = 4

    expect(() => parseWorkLogBackup(serializeWorkLogBackup(backup))).toThrow(
      'incomplete or malformed',
    )
  })

  it('losslessly tags Firestore-only values and escapes colliding user maps', () => {
    const date = new Date('2026-07-29T15:00:00.000Z')

    expect(
      encodeFirestoreBackupValue({
        timestamp: Timestamp.fromDate(date),
        point: new GeoPoint(39.7392, -104.9903),
        bytes: Bytes.fromUint8Array(new TextEncoder().encode('backup')),
        specialNumber: Number.POSITIVE_INFINITY,
        nestedUserMap: {
          $firestoreType: 'ordinary user data',
        },
      }),
    ).toEqual({
      timestamp: {
        $firestoreType: 'timestamp',
        value: date.toISOString(),
      },
      point: {
        $firestoreType: 'geoPoint',
        latitude: 39.7392,
        longitude: -104.9903,
      },
      bytes: {
        $firestoreType: 'bytes',
        encoding: 'base64',
        value: 'YmFja3Vw',
      },
      specialNumber: {
        $firestoreType: 'number',
        value: 'Infinity',
      },
      nestedUserMap: {
        $firestoreType: 'map',
        value: {
          $firestoreType: 'ordinary user data',
        },
      },
    })
  })
})
