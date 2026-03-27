<script setup lang="ts">
import { useReportsDraft } from '~/composables/useReportsDraft'
import { useReportsPreviewData } from '~/composables/useReportsPreviewData'
import { useReportsPublishing } from '~/composables/useReportsPublishing'

const draftState = useReportsDraft()
const previewData = useReportsPreviewData({
  draft: draftState.draft,
  selectedReport: draftState.selectedReport,
  sortedProjects: draftState.sortedProjects,
  sortedTags: draftState.sortedTags,
})
const publishing = useReportsPublishing({
  canPublish: previewData.canPublish,
  draft: draftState.draft,
  selectedReport: draftState.selectedReport,
  selectedReportId: draftState.selectedReportId,
  shareLink: previewData.shareLink,
})

const {
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
} = draftState
const { canPublish, previewSnapshot, shareLink } = previewData
const {
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
} = publishing
</script>

<template>
  <WorkspaceSidebarLayout content-body-class="px-6 pt-12 pb-6" sidebar-body-class="px-6 pt-12 pb-6">
    <template #sidebar>
      <div class="flex min-h-full flex-col">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Reports</div>
            <div class="mt-1 text-3xl font-bold text-text">Saved drafts</div>
          </div>
          <AppButton variant="primary" :disabled="isSaving" @click="createSavedReport">
            New
          </AppButton>
        </div>

        <div class="mt-4 flex flex-1 flex-col gap-3">
          <ContainerCard
            v-if="reports.length === 0"
            class="border-dashed py-6 text-sm text-text-muted shadow-none"
            padding="compact"
            variant="subtle"
          >
            Create a saved report draft to start composing a client-facing summary.
          </ContainerCard>
          <ContainerCard
            v-for="report in reports"
            :key="report.id"
            as="button"
            class="flex w-full flex-col rounded-xl px-3 py-3 text-left shadow-control"
            :interactive="report.id !== selectedReportId"
            padding="compact"
            :selected="report.id === selectedReportId"
            :variant="report.id === selectedReportId ? 'muted' : 'default'"
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
          </ContainerCard>
        </div>
      </div>
    </template>

    <template #default>
      <div class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
        <ContainerCard as="section">
          <div class="flex flex-col gap-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Editor</div>
                <div class="mt-1 text-2xl font-bold text-text">Report settings</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <AppButton variant="secondary" :disabled="isSaving" @click="ensureSavedReport">
                  {{ isSaving ? 'Saving…' : 'Save draft' }}
                </AppButton>
                <AppButton
                  variant="primary"
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
                </AppButton>
                <AppButton
                  v-if="selectedReport?.shareToken"
                  variant="secondary"
                  :disabled="isCopyingLink"
                  @click="copyShareLink"
                >
                  {{ isCopyingLink ? 'Copying…' : 'Copy link' }}
                </AppButton>
                <AppButton
                  v-if="selectedReport?.publishedAt"
                  variant="secondary"
                  :disabled="isUnpublishing"
                  @click="unpublishReport"
                >
                  {{ isUnpublishing ? 'Unpublishing…' : 'Unpublish' }}
                </AppButton>
              </div>
            </div>

            <div class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
              <div class="flex flex-col gap-4">
                <AppField label="Title">
                  <AppTextInput v-model="draft.title" placeholder="Client Report" />
                </AppField>

                <AppField label="Summary">
                  <AppTextarea
                    v-model="draft.summary"
                    rows="6"
                    placeholder="High-level write-up for the client-facing report"
                  />
                </AppField>

                <div class="grid gap-4 md:grid-cols-3">
                  <AppField label="Timezone">
                    <AppTextInput v-model="draft.timezone" placeholder="America/Denver" />
                  </AppField>
                  <AppField label="Start date">
                    <AppTextInput v-model="draft.filters.dateStart" type="date" />
                  </AppField>
                  <AppField label="End date">
                    <AppTextInput v-model="draft.filters.dateEnd" type="date" />
                  </AppField>
                </div>

                <AppField as="div" class="!gap-3" label="Quick ranges">
                  <div class="flex flex-wrap gap-2">
                    <AppButton
                      v-for="preset in datePresets"
                      :key="preset.id"
                      shape="pill"
                      size="sm"
                      variant="secondary"
                      @click="applyDatePreset(preset.dateStart, preset.dateEnd)"
                    >
                      {{ preset.label }}
                    </AppButton>
                  </div>
                </AppField>
              </div>

              <div class="grid gap-4">
                <ContainerCard v-if="!hideTags" padding="compact" variant="muted">
                  <AppFieldLabel as="div">Group combination</AppFieldLabel>
                  <div class="mt-3 grid gap-2 md:grid-cols-2">
                    <AppFieldInlineChoice>
                      <input
                        v-model="draft.filters.groupOperator"
                        type="radio"
                        value="intersection"
                      />
                      Project AND tag
                    </AppFieldInlineChoice>
                    <AppFieldInlineChoice>
                      <input v-model="draft.filters.groupOperator" type="radio" value="union" />
                      Project OR tag
                    </AppFieldInlineChoice>
                  </div>
                </ContainerCard>

                <ContainerCard v-if="!hideTags" padding="compact" variant="muted">
                  <AppFieldLabel as="div">Tag matching</AppFieldLabel>
                  <div class="mt-3 grid gap-2 md:grid-cols-2">
                    <AppFieldInlineChoice>
                      <input v-model="draft.filters.tagOperator" type="radio" value="any" />
                      Any selected tag
                    </AppFieldInlineChoice>
                    <AppFieldInlineChoice>
                      <input v-model="draft.filters.tagOperator" type="radio" value="all" />
                      All selected tags
                    </AppFieldInlineChoice>
                  </div>
                </ContainerCard>

                <div class="grid gap-4 xl:grid-cols-2">
                  <ContainerCard padding="compact" variant="muted">
                    <AppFieldLabel as="div">Projects</AppFieldLabel>
                    <div class="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
                      <AppFieldInlineChoice v-for="project in sortedProjects" :key="project.id">
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
                      </AppFieldInlineChoice>
                    </div>
                  </ContainerCard>

                  <ContainerCard v-if="!hideTags" padding="compact" variant="muted">
                    <AppFieldLabel as="div">Tags</AppFieldLabel>
                    <div class="mt-3 flex max-h-56 flex-col gap-2 overflow-auto">
                      <AppFieldInlineChoice v-for="tag in sortedTags" :key="tag.id">
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
                      </AppFieldInlineChoice>
                    </div>
                  </ContainerCard>
                </div>

                <ContainerCard
                  v-if="hasHiddenLegacyTagFilters"
                  class="text-sm text-text-muted shadow-none"
                  padding="compact"
                  variant="muted"
                >
                  This report still includes legacy tag filters. They remain active for existing
                  data, but tag editing is hidden while project-only mode is on.
                </ContainerCard>
              </div>
            </div>

            <ContainerCard
              v-if="shareLink"
              class="rounded-xl py-3 text-sm text-text shadow-none"
              padding="compact"
              variant="muted"
            >
              Public link:
              <a class="text-link underline hover:text-link-hover" :href="shareLink">{{
                shareLink
              }}</a>
            </ContainerCard>

            <p v-if="mutationErrorMessage" class="text-sm text-danger">
              {{ mutationErrorMessage }}
            </p>
          </div>
        </ContainerCard>

        <ContainerCard v-if="previewSnapshot" as="section">
          <div class="mb-5 text-xs tracking-[0.18em] text-text-subtle uppercase">Preview</div>
          <ReportSnapshotView
            :hide-tags="hideTags"
            :title="draft.title.trim() || 'Untitled report'"
            :summary="draft.summary"
            :snapshot="previewSnapshot"
            :published-at-iso="selectedReport?.publishedAt?.toISOString() ?? ''"
          />
        </ContainerCard>
      </div>
    </template>
  </WorkspaceSidebarLayout>
</template>
