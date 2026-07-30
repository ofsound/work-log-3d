import { ref } from 'vue'

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { useCurrentUser, useFirebaseAuth, useRuntimeConfig } from '#imports'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { downloadWorkLogBackup, encodeFirestoreBackupDocument } from '~/utils/account-backup'
import { WORK_LOG_BACKUP_COLLECTION_IDS, createWorkLogBackup } from '~~/shared/worklog'
import type {
  WorkLogBackupCollections,
  WorkLogBackupDocument,
  WorkLogBackupPublicReport,
} from '~~/shared/worklog'

const getAccountBackupErrorMessage = (error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''

  if (code.includes('permission-denied')) {
    return 'Backup access was denied. Refresh the app and try again.'
  }

  if (code.includes('unauthenticated')) {
    return 'Your session expired. Sign in again before exporting.'
  }

  if (code.includes('unavailable') || code.includes('network-request-failed')) {
    return 'The backup service is unavailable. Check your connection and try again.'
  }

  return 'Unable to export the account backup.'
}

const isPermissionDenied = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  String(error.code).includes('permission-denied')

export function useAccountBackup() {
  const auth = useFirebaseAuth()
  const user = useCurrentUser()
  const runtimeConfig = useRuntimeConfig()
  const { db } = useFirestoreCollections()
  const isExporting = ref(false)
  const exportMessage = ref('')
  const exportErrorMessage = ref('')

  const exportBackup = async () => {
    const currentUser = user.value

    if (!auth || !currentUser) {
      exportErrorMessage.value = 'Sign in before exporting a backup.'
      return
    }

    isExporting.value = true
    exportMessage.value = ''
    exportErrorMessage.value = ''

    try {
      const uid = currentUser.uid
      const userReference = doc(db, 'users', uid)
      const [userSnapshot, ...collectionSnapshots] = await Promise.all([
        getDoc(userReference),
        ...WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId) =>
          getDocs(collection(userReference, collectionId)),
        ),
      ])
      const collections = Object.fromEntries(
        WORK_LOG_BACKUP_COLLECTION_IDS.map((collectionId, index) => [
          collectionId,
          collectionSnapshots[index]!.docs.map(encodeFirestoreBackupDocument)
            .filter((document): document is WorkLogBackupDocument => document !== null)
            .sort((left, right) => left.id.localeCompare(right.id)),
        ]),
      ) as WorkLogBackupCollections
      let publicReports: WorkLogBackupPublicReport[] = []
      let publicReportSnapshots: 'complete' | 'unavailable' = 'complete'

      try {
        const publicReportsSnapshot = await getDocs(
          query(collection(db, 'publicReports'), where('ownerId', '==', uid)),
        )

        publicReports = await Promise.all(
          publicReportsSnapshot.docs.map(
            async (reportSnapshot): Promise<WorkLogBackupPublicReport> => {
              const document = encodeFirestoreBackupDocument(reportSnapshot)

              if (!document) {
                throw new Error(`Published report ${reportSnapshot.id} has no data.`)
              }

              const sessionRowsSnapshot = await getDocs(
                collection(reportSnapshot.ref, 'sessionRows'),
              )

              return {
                document,
                sessionRows: sessionRowsSnapshot.docs
                  .map(encodeFirestoreBackupDocument)
                  .filter((row): row is WorkLogBackupDocument => row !== null)
                  .sort((left, right) => left.id.localeCompare(right.id)),
              }
            },
          ),
        )
        publicReports.sort((left, right) => left.document.id.localeCompare(right.document.id))
      } catch (error) {
        if (!isPermissionDenied(error)) {
          throw error
        }

        publicReportSnapshots = 'unavailable'
      }

      const backup = createWorkLogBackup({
        exportedAt: new Date(),
        appVersion: String(runtimeConfig.public.appVersion ?? ''),
        account: {
          sourceUserId: uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoUrl: currentUser.photoURL,
        },
        userDocument: encodeFirestoreBackupDocument(userSnapshot),
        collections,
        publicReports,
        publicReportSnapshots,
      })

      downloadWorkLogBackup(backup)
      exportMessage.value =
        publicReportSnapshots === 'complete'
          ? 'Backup downloaded.'
          : 'Backup downloaded. Published report snapshots were unavailable.'
    } catch (error) {
      exportErrorMessage.value = getAccountBackupErrorMessage(error)
    } finally {
      isExporting.value = false
    }
  }

  return {
    exportBackup,
    exportErrorMessage,
    exportMessage,
    isExporting,
  }
}
