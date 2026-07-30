import type { WorkLogBackupV1 } from '~~/shared/worklog'
import { serializeWorkLogBackup } from '~~/shared/worklog'

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
