import { computed, ref, watch } from 'vue'

import { useCollection } from 'vuefire'
import { orderBy, query } from 'firebase/firestore'

import {
  buildReportDatePresets,
  cloneReportInput,
  createDefaultBrowserReportInput,
} from '~/utils/report-ui'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useUserSettings } from '~/composables/useUserSettings'
import type {
  FirebaseProjectDocument,
  FirebaseReportDocument,
  FirebaseTagDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toReports, toTags } from '~/utils/worklog-firebase'
import { sortNamedEntities } from '~~/shared/worklog'

export function useReportsDraft() {
  const { hideTags } = useUserSettings()
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
  const datePresets = computed(() => buildReportDatePresets(new Date(), draft.value.timezone))
  const hasHiddenLegacyTagFilters = computed(
    () => hideTags.value && draft.value.filters.tagIds.length > 0,
  )

  const loadDraftFromSelectedReport = () => {
    if (!selectedReport.value) {
      return
    }

    draft.value = cloneReportInput(selectedReport.value)
    lastLoadedReportId.value = selectedReport.value.id
  }

  const setDraftSelection = (type: 'projectIds' | 'tagIds', id: string, checked: boolean) => {
    const nextValues = new Set(draft.value.filters[type])

    if (checked) {
      nextValues.add(id)
    } else {
      nextValues.delete(id)
    }

    draft.value = {
      ...draft.value,
      filters: {
        ...draft.value.filters,
        [type]: [...nextValues],
      },
    }
  }

  const applyDatePreset = (dateStart: string, dateEnd: string) => {
    draft.value = {
      ...draft.value,
      filters: {
        ...draft.value.filters,
        dateStart,
        dateEnd,
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
    applyDatePreset,
    datePresets,
    draft,
    hasHiddenLegacyTagFilters,
    hideTags,
    reports,
    selectedReport,
    selectedReportId,
    setDraftSelection,
    sortedProjects,
    sortedTags,
  }
}
