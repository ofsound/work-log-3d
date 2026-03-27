import type { ComputedRef, Ref } from 'vue'

import { computed } from 'vue'

import { Timestamp, orderBy, query, where } from 'firebase/firestore'
import { useCollection } from 'vuefire'

import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { getPublicReportPath } from '~/utils/worklog-routes'
import type { FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toTimeBoxes } from '~/utils/worklog-firebase'
import type { Project, ReportInput, Tag } from '~~/shared/worklog'
import { buildReportSnapshot, getReportRange } from '~~/shared/worklog'

export interface UseReportsPreviewDataOptions {
  draft: Ref<ReportInput>
  selectedReport: ComputedRef<{ shareToken?: string | null } | null>
  sortedProjects: ComputedRef<Project[]>
  sortedTags: ComputedRef<Tag[]>
}

export function useReportsPreviewData(options: UseReportsPreviewDataOptions) {
  const { timeBoxesCollection } = useFirestoreCollections()

  const previewRange = computed(() => {
    try {
      return getReportRange(options.draft.value.filters, options.draft.value.timezone)
    } catch {
      return null
    }
  })

  const previewQuery = computed(() => {
    const range = previewRange.value

    if (!timeBoxesCollection.value) {
      return null
    }

    if (!range) {
      return query(timeBoxesCollection.value, orderBy('startTime', 'asc'))
    }

    return query(
      timeBoxesCollection.value,
      where('startTime', '<', Timestamp.fromDate(range.end)),
      where('endTime', '>', Timestamp.fromDate(range.start)),
      orderBy('startTime', 'asc'),
      orderBy('endTime', 'asc'),
    )
  })

  const previewTimeBoxes = useCollection(previewQuery, {
    ssrKey: 'reports-workspace-preview-time-boxes',
  })

  const previewSnapshot = computed(() => {
    try {
      return buildReportSnapshot({
        filters: options.draft.value.filters,
        timezone: options.draft.value.timezone,
        projects: options.sortedProjects.value,
        tags: options.sortedTags.value,
        timeBoxes: toTimeBoxes(previewTimeBoxes.value as FirebaseTimeBoxDocument[]),
      })
    } catch {
      return null
    }
  })

  const shareLink = computed(() => {
    const token = options.selectedReport.value?.shareToken

    if (!token || typeof window === 'undefined') {
      return ''
    }

    return new URL(getPublicReportPath(token), window.location.origin).toString()
  })

  const canPublish = computed(() => previewSnapshot.value !== null)

  return {
    canPublish,
    previewSnapshot,
    shareLink,
  }
}
