import { computed, ref, watch } from 'vue'

import { useCollection } from 'vuefire'
import { orderBy, query } from 'firebase/firestore'

import { cloneReportInput, createDefaultBrowserReportInput } from '~/utils/report-ui'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import type {
  FirebaseProjectDocument,
  FirebaseReportDocument,
  FirebaseTagDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toReports, toTags } from '~/utils/worklog-firebase'
import { reportFiltersWithAllTagsInScope, sortNamedEntities } from '~~/shared/worklog'

export function useReportsDraft() {
  const { reportsCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

  const selectedReportId = ref('')
  const lastLoadedReportId = ref('')
  const draft = ref(createDefaultBrowserReportInput())

  const reportsQuery = computed(() =>
    reportsCollection.value ? query(reportsCollection.value, orderBy('updatedAt', 'desc')) : null,
  )
  const rawReports = useCollection(reportsQuery, {
    ssrKey: 'reports-workspace-reports',
  })
  const rawProjects = useCollection(projectsCollection)
  const rawTags = useCollection(tagsCollection)

  const reports = computed(() =>
    toReports(rawReports.value as FirebaseReportDocument[]).sort(
      (left, right) =>
        (right.updatedAt?.valueOf() ?? 0) - (left.updatedAt?.valueOf() ?? 0) ||
        left.title.localeCompare(right.title),
    ),
  )
  const sortedProjects = computed(() =>
    sortNamedEntities(toProjects(rawProjects.value as FirebaseProjectDocument[])),
  )
  const sortedTags = computed(() =>
    sortNamedEntities(toTags(rawTags.value as FirebaseTagDocument[])),
  )
  const selectedReport = computed(
    () => reports.value.find((report) => report.id === selectedReportId.value) ?? null,
  )

  const loadDraftFromSelectedReport = () => {
    if (!selectedReport.value) {
      return
    }

    const loaded = cloneReportInput(selectedReport.value)
    draft.value = {
      ...loaded,
      filters: reportFiltersWithAllTagsInScope(loaded.filters),
    }
    lastLoadedReportId.value = selectedReport.value.id
  }

  const setDraftSelection = (type: 'projectIds', id: string, checked: boolean) => {
    const nextValues = new Set(draft.value.filters.projectIds)

    if (checked) {
      nextValues.add(id)
    } else {
      nextValues.delete(id)
    }

    draft.value = {
      ...draft.value,
      filters: {
        ...draft.value.filters,
        projectIds: [...nextValues],
      },
    }
  }

  watch(
    reports,
    (nextReports) => {
      if (nextReports.length === 0) {
        selectedReportId.value = ''
        lastLoadedReportId.value = ''
        draft.value = createDefaultBrowserReportInput()
        return
      }

      if (
        !selectedReportId.value ||
        !nextReports.some((report) => report.id === selectedReportId.value)
      ) {
        selectedReportId.value = nextReports[0]!.id
      }
    },
    { immediate: true },
  )

  watch(
    selectedReport,
    (report) => {
      if (!report) {
        return
      }

      if (report.id !== lastLoadedReportId.value) {
        loadDraftFromSelectedReport()
      }
    },
    { immediate: true },
  )

  return {
    draft,
    reports,
    selectedReport,
    selectedReportId,
    setDraftSelection,
    sortedProjects,
    sortedTags,
  }
}
