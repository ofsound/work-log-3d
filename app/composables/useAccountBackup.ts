import { ref } from 'vue'

import { useCurrentUser, useFirebaseAuth } from '#imports'

import { downloadWorkLogBackup } from '~/utils/account-backup'
import type { WorkLogBackupV1 } from '~~/shared/worklog'
import { getWorklogErrorMessage } from '~~/shared/worklog'

export function useAccountBackup() {
  const auth = useFirebaseAuth()
  const user = useCurrentUser()
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
      const backup = await $fetch<WorkLogBackupV1>('/api/account/backup', {
        headers: {
          authorization: `Bearer ${await currentUser.getIdToken()}`,
        },
      })

      downloadWorkLogBackup(backup)
      exportMessage.value = 'Backup downloaded.'
    } catch (error) {
      exportErrorMessage.value = getWorklogErrorMessage(
        error,
        'Unable to export the account backup.',
      )
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
