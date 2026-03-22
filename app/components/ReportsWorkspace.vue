<script setup lang="ts">
import { Timestamp, orderBy, query, where } from 'firebase/firestore'

import {
  buildReportDatePresets,
  cloneReportInput,
  createDefaultBrowserReportInput,
} from '~/utils/report-ui'
import { getPublicReportPath } from '~/utils/worklog-routes'
import type {
  FirebaseProjectDocument,
  FirebaseReportDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toReports, toTags, toTimeBoxes } from '~/utils/worklog-firebase'
import {
  buildReportSnapshot,
  getReportRange,
  getWorklogErrorMessage,
  sortNamedEntities,
  validateReportInput,
} from '~~/shared/worklog'

const auth = useFirebaseAuth()
const user = useCurrentUser()
const repositories = useWorklogRepository()
const { hideTags } = useUserSettings()
const { reportsCollection, projectsCollection, tagsCollection, timeBoxesCollection } =
  useFirestoreCollections()

const selectedReportId = ref('')
const lastLoadedReportId = ref('')
const draft = ref(createDefaultBrowserReportInput())
const mutationErrorMessage = ref('')
const isSaving = ref(false)
const isPublishing = ref(false)
const isUnpublishing = ref(false)
const isCopyingLink = ref(false)

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
const sortedTags = computed(() => sortNamedEntities(toTags(rawTags.value as FirebaseTagDocument[])))
const selectedReport = computed(
  () => reports.value.find((report) => report.id === selectedReportId.value) ?? null,
)
const previewRange = computed(() => {
  try {
    return getReportRange(draft.value.filters, draft.value.timezone)
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
      filters: draft.value.filters,
      timezone: draft.value.timezone,
      projects: sortedProjects.value,
      tags: sortedTags.value,
      timeBoxes: toTimeBoxes(previewTimeBoxes.value as FirebaseTimeBoxDocument[]),
    })
  } catch {
    return null
  }
})
const datePresets = computed(() => buildReportDatePresets(new Date(), draft.value.timezone))
const shareLink = computed(() => {
  const token = selectedReport.value?.shareToken

  if (!token || typeof window === 'undefined') {
    return ''
  }

  return new URL(getPublicReportPath(token), window.location.origin).toString()
})
const canPublish = computed(() => previewSnapshot.value !== null)
const hasHiddenLegacyTagFilters = computed(
  () => hideTags.value && draft.value.filters.tagIds.length > 0,
)

const loadDraftFromSelectedReport = () => {
  if (selectedReport.value) {
    draft.value = cloneReportInput(selectedReport.value)
    lastLoadedReportId.value = selectedReport.value.id
    return
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

watch(selectedReport, (report) => {
  mutationErrorMessage.value = ''

  if (!report) {
    return
  }

  if (report.id !== lastLoadedReportId.value) {
    loadDraftFromSelectedReport()
  }
})

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

const buildReportPayload = () => validateReportInput(cloneReportInput(draft.value))

const ensureSavedReport = async () => {
  const payload = buildReportPayload()
  isSaving.value = true

  try {
    mutationErrorMessage.value = ''

    if (selectedReport.value) {
      await repositories.reports.update(selectedReport.value.id, payload)
      return selectedReport.value.id
    }

    const createdId = await repositories.reports.create(payload)
    selectedReportId.value = createdId
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
    selectedReportId.value = createdId
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
  if (!canPublish.value) {
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
  if (!selectedReport.value) {
    return
  }

  isUnpublishing.value = true

  try {
    await $fetch(`/api/reports/${encodeURIComponent(selectedReport.value.id)}/unpublish`, {
      method: 'POST',
      headers: await getAuthHeader(),
    })
    mutationErrorMessage.value = ''
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to unpublish the report.')
  } finally {
    isUnpublishing.value = false
  }
}

const copyShareLink = async () => {
  if (!shareLink.value || !navigator.clipboard) {
    mutationErrorMessage.value = 'Copying links is not available in this browser.'
    return
  }

  isCopyingLink.value = true

  try {
    await navigator.clipboard.writeText(shareLink.value)
    mutationErrorMessage.value = ''
  } catch {
    mutationErrorMessage.value = 'Unable to copy the public link.'
  } finally {
    isCopyingLink.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 gap-6 px-6 pt-6 pb-6">
    <aside
      class="flex w-full max-w-90 shrink-0 flex-col rounded-2xl border border-border-subtle bg-surface px-4 py-4 shadow-panel"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Reports</div>
          <div class="mt-1 text-xl font-bold text-text">Saved drafts</div>
        </div>
        <button
          class="cursor-pointer rounded-lg bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover disabled:opacity-50"
          :disabled="isSaving"
          @click="createSavedReport"
        >
          New
        </button>
      </div>

      <div class="mt-4 flex-1 overflow-auto">
        <div
          v-if="reports.length === 0"
          class="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-text-muted"
        >
          Create a saved report draft to start composing a client-facing summary.
        </div>
        <button
          v-for="report in reports"
          :key="report.id"
          class="mb-3 flex w-full cursor-pointer flex-col rounded-xl border px-3 py-3 text-left shadow-control transition hover:border-border-strong"
          :class="
            report.id === selectedReportId
              ? 'border-border-strong bg-surface-subtle'
              : 'border-border-subtle bg-surface'
          "
          @click="selectedReportId = report.id"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="font-semibold text-text">{{ report.title }}</div>
            <div
              v-if="report.publishedAt"
              class="rounded-full bg-badge-duration px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-badge-duration-text uppercase"
            >
              Live
            </div>
          </div>
          <div class="mt-2 text-xs text-text-subtle">
            {{ report.filters.dateStart }} - {{ report.filters.dateEnd }}
          </div>
          <div class="mt-1 text-xs text-text-subtle">{{ report.timezone }}</div>
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col gap-6 overflow-auto">
      <section class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel">
        <div class="flex flex-col gap-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Editor</div>
              <div class="mt-1 text-2xl font-bold text-text">Report settings</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:opacity-50"
                :disabled="isSaving"
                @click="ensureSavedReport"
              >
                {{ isSaving ? 'Saving…' : 'Save draft' }}
              </button>
              <button
                class="cursor-pointer rounded-lg bg-button-primary px-3 py-2 text-sm font-semibold text-button-primary-text shadow-button-primary hover:bg-button-primary-hover disabled:opacity-50"
                :disabled="isPublishing || !canPublish"
                @click="publishReport"
              >
                {{
                  isPublishing
                    ? 'Publishing…'
                    : selectedReport?.publishedAt
                      ? 'Republish'
                      : 'Publish'
                }}
              </button>
              <button
                v-if="selectedReport?.shareToken"
                class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:opacity-50"
                :disabled="isCopyingLink"
                @click="copyShareLink"
              >
                {{ isCopyingLink ? 'Copying…' : 'Copy link' }}
              </button>
              <button
                v-if="selectedReport?.publishedAt"
                class="cursor-pointer rounded-lg border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover disabled:opacity-50"
                :disabled="isUnpublishing"
                @click="unpublishReport"
              >
                {{ isUnpublishing ? 'Unpublishing…' : 'Unpublish' }}
              </button>
            </div>
          </div>

          <div class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Title</span>
                <input
                  v-model="draft.title"
                  class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  placeholder="Client Report"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-text">Summary</span>
                <textarea
                  v-model="draft.summary"
                  rows="6"
                  class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  placeholder="High-level write-up for the client-facing report"
                />
              </label>

              <div class="grid gap-4 md:grid-cols-3">
                <label class="flex flex-col gap-2">
                  <span class="text-sm font-semibold text-text">Timezone</span>
                  <input
                    v-model="draft.timezone"
                    class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                    placeholder="America/Denver"
                  />
                </label>
                <label class="flex flex-col gap-2">
                  <span class="text-sm font-semibold text-text">Start date</span>
                  <input
                    v-model="draft.filters.dateStart"
                    type="date"
                    class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  />
                </label>
                <label class="flex flex-col gap-2">
                  <span class="text-sm font-semibold text-text">End date</span>
                  <input
                    v-model="draft.filters.dateEnd"
                    type="date"
                    class="rounded-xl border border-input-border bg-input px-3 py-2 text-text"
                  />
                </label>
              </div>

              <div>
                <div class="text-sm font-semibold text-text">Quick ranges</div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="preset in datePresets"
                    :key="preset.id"
                    class="cursor-pointer rounded-full border border-button-secondary-border bg-button-secondary px-3 py-1.5 text-sm text-button-secondary-text hover:bg-button-secondary-hover"
                    @click="applyDatePreset(preset.dateStart, preset.dateEnd)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="grid gap-4">
              <div
                v-if="!hideTags"
                class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4"
              >
                <div class="text-sm font-semibold text-text">Group combination</div>
                <div class="mt-3 grid gap-2 md:grid-cols-2">
                  <label class="flex items-center gap-2 text-sm text-text">
                    <input
                      v-model="draft.filters.groupOperator"
                      type="radio"
                      value="intersection"
                    />
                    Project AND tag
                  </label>
                  <label class="flex items-center gap-2 text-sm text-text">
                    <input v-model="draft.filters.groupOperator" type="radio" value="union" />
                    Project OR tag
                  </label>
                </div>
              </div>

              <div
                v-if="!hideTags"
                class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4"
              >
                <div class="text-sm font-semibold text-text">Tag matching</div>
                <div class="mt-3 grid gap-2 md:grid-cols-2">
                  <label class="flex items-center gap-2 text-sm text-text">
                    <input v-model="draft.filters.tagOperator" type="radio" value="any" />
                    Any selected tag
                  </label>
                  <label class="flex items-center gap-2 text-sm text-text">
                    <input v-model="draft.filters.tagOperator" type="radio" value="all" />
                    All selected tags
                  </label>
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-2">
                <div class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4">
                  <div class="text-sm font-semibold text-text">Projects</div>
                  <div class="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
                    <label
                      v-for="project in sortedProjects"
                      :key="project.id"
                      class="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        :checked="draft.filters.projectIds.includes(project.id)"
                        type="checkbox"
                        @change="
                          setDraftSelection(
                            'projectIds',
                            project.id,
                            ($event.target as HTMLInputElement).checked,
                          )
                        "
                      />
                      {{ project.name }}
                    </label>
                  </div>
                </div>

                <div
                  v-if="!hideTags"
                  class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4"
                >
                  <div class="text-sm font-semibold text-text">Tags</div>
                  <div class="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
                    <label
                      v-for="tag in sortedTags"
                      :key="tag.id"
                      class="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        :checked="draft.filters.tagIds.includes(tag.id)"
                        type="checkbox"
                        @change="
                          setDraftSelection(
                            'tagIds',
                            tag.id,
                            ($event.target as HTMLInputElement).checked,
                          )
                        "
                      />
                      {{ tag.name }}
                    </label>
                  </div>
                </div>
              </div>

              <div
                v-if="hasHiddenLegacyTagFilters"
                class="rounded-2xl border border-border-subtle bg-surface-muted px-4 py-4 text-sm text-text-muted"
              >
                This report still includes legacy tag filters. They remain active for existing data,
                but tag editing is hidden while project-first mode is on.
              </div>
            </div>
          </div>

          <div
            v-if="shareLink"
            class="rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-text"
          >
            Public link:
            <a class="text-link underline hover:text-link-hover" :href="shareLink">{{
              shareLink
            }}</a>
          </div>

          <p v-if="mutationErrorMessage" class="text-sm text-danger">
            {{ mutationErrorMessage }}
          </p>
        </div>
      </section>

      <section
        v-if="previewSnapshot"
        class="rounded-2xl border border-border-subtle bg-surface px-5 py-5 shadow-panel"
      >
        <div class="mb-5 text-xs tracking-[0.18em] text-text-subtle uppercase">Preview</div>
        <ReportSnapshotView
          :hide-tags="hideTags"
          :title="draft.title.trim() || 'Untitled report'"
          :summary="draft.summary"
          :snapshot="previewSnapshot"
          :published-at-iso="selectedReport?.publishedAt?.toISOString() ?? ''"
        />
      </section>
    </div>
  </div>
</template>
