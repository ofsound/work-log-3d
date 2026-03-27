import type { ComputedRef, Ref } from 'vue'

import { ref, watch } from 'vue'

import { useCurrentUser, useFirebaseAuth } from '#imports'

import { useWorklogRepository } from '~/composables/useWorklogRepository'
import { cloneReportInput, createDefaultBrowserReportInput } from '~/utils/report-ui'
import type { ReportInput } from '~~/shared/worklog'
import { getWorklogErrorMessage, validateReportInput } from '~~/shared/worklog'

export interface UseReportsPublishingOptions {
  canPublish: ComputedRef<boolean>
  draft: Ref<ReportInput>
  selectedReport: ComputedRef<{ id: string; publishedAt?: Date | null } | null>
  selectedReportId: Ref<string>
  shareLink: ComputedRef<string>
}

export function useReportsPublishing(options: UseReportsPublishingOptions) {
  const auth = useFirebaseAuth()
  const user = useCurrentUser()
  const repositories = useWorklogRepository()

  const mutationErrorMessage = ref('')
  const isSaving = ref(false)
  const isPublishing = ref(false)
  const isUnpublishing = ref(false)
  const isCopyingLink = ref(false)

  const buildReportPayload = () => validateReportInput(cloneReportInput(options.draft.value))

  watch(options.selectedReport, () => {
    mutationErrorMessage.value = ''
  })

  const ensureSavedReport = async () => {
    const payload = buildReportPayload()
    isSaving.value = true

    try {
      mutationErrorMessage.value = ''

      if (options.selectedReport.value) {
        await repositories.reports.update(options.selectedReport.value.id, payload)
        return options.selectedReport.value.id
      }

      const createdId = await repositories.reports.create(payload)
      options.selectedReportId.value = createdId
      return createdId
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to save the report.')
      throw error
    } finally {
      isSaving.value = false
    }
  }

  const createSavedReport = async () => {
    isSaving.value = true

    try {
      mutationErrorMessage.value = ''
      const createdId = await repositories.reports.create(createDefaultBrowserReportInput())
      options.selectedReportId.value = createdId
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to create the report.')
    } finally {
      isSaving.value = false
    }
  }

  const getAuthHeader = async () => {
    const currentUser = user.value

    if (!auth || !currentUser) {
      throw new Error('Authentication required.')
    }

    return {
      authorization: `Bearer ${await currentUser.getIdToken()}`,
    }
  }

  const publishReport = async () => {
    if (!options.canPublish.value) {
      mutationErrorMessage.value = 'Resolve the report filters before publishing.'
      return
    }

    isPublishing.value = true

    try {
      const reportId = await ensureSavedReport()

      await $fetch(`/api/reports/${encodeURIComponent(reportId)}/publish`, {
        method: 'POST',
        headers: await getAuthHeader(),
      })
      mutationErrorMessage.value = ''
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to publish the report.')
    } finally {
      isPublishing.value = false
    }
  }

  const unpublishReport = async () => {
    if (!options.selectedReport.value) {
      return
    }

    isUnpublishing.value = true

    try {
      await $fetch(
        `/api/reports/${encodeURIComponent(options.selectedReport.value.id)}/unpublish`,
        {
          method: 'POST',
          headers: await getAuthHeader(),
        },
      )
      mutationErrorMessage.value = ''
    } catch (error) {
      mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to unpublish the report.')
    } finally {
      isUnpublishing.value = false
    }
  }

  const copyShareLink = async () => {
    if (!options.shareLink.value || !navigator.clipboard) {
      mutationErrorMessage.value = 'Copying links is not available in this browser.'
      return
    }

    isCopyingLink.value = true

    try {
      await navigator.clipboard.writeText(options.shareLink.value)
      mutationErrorMessage.value = ''
    } catch {
      mutationErrorMessage.value = 'Unable to copy the public link.'
    } finally {
      isCopyingLink.value = false
    }
  }

  return {
    copyShareLink,
    createSavedReport,
    ensureSavedReport,
    isCopyingLink,
    isPublishing,
    isSaving,
    isUnpublishing,
    mutationErrorMessage,
    publishReport,
    unpublishReport,
  }
}
