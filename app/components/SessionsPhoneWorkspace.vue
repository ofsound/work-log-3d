<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import CloseIcon from '@/icons/CloseIcon.vue'

import {
  formatDateKey,
  type NamedEntity,
  type Project,
  type SessionListFilters,
  type TimeBox,
} from '~~/shared/worklog'

import type { PanelMode } from '~/composables/useSessionsPanelState'
import type { SessionsViewMode } from '~/utils/sessions-route-state'

interface SessionsWorkspaceHeaderSummary {
  count: number
  durationLabel: string
  projectCount: number
}

const props = defineProps<{
  anchorDate: Date
  calendarHeaderSummary: SessionsWorkspaceHeaderSummary | null
  currentMode: SessionsViewMode
  filteredSessionListTimeBoxes: TimeBox[]
  hideTags: boolean
  initialEndTime: string
  initialStartTime: string
  listFilters: SessionListFilters
  listSearchTokens: string[]
  listSummary: SessionsWorkspaceHeaderSummary
  mutationErrorMessage: string
  pageTitle: string
  panelMode: PanelMode
  panelSessionId: string
  projectById: Record<string, Project>
  projectNameById: Record<string, string>
  scratchpadDateKey: string
  selectedSessionId: string
  sessionViewItems: ReadonlyArray<{ id: SessionsViewMode; label: string }>
  sortedTags: NamedEntity[]
  visibleDayTimeBoxes: TimeBox[]
  onBackToOverview: () => void
  onAddSession: () => void
  onClearFilters: () => void
  onClosePanel: () => void
  onCreated: (sessionId: string) => void
  onGoToday: () => void
  onNavigatePeriod: (direction: -1 | 1) => void
  onOpenSession: (payload: { sessionId: string; day?: Date }) => void
  onSelectMode: (mode: SessionsViewMode) => void
  onShowOverview: () => void
  onShowScratchpad: () => void
  onUpdateFilters: (value: Partial<SessionListFilters>) => void
}>()

const isFilterSheetOpen = ref(false)
const mainScrollEl = ref<HTMLElement | null>(null)

watch(
  () => (props.currentMode === 'day' ? formatDateKey(props.anchorDate) : null),
  async (nextKey, prevKey) => {
    if (nextKey === null) {
      return
    }
    if (prevKey === undefined) {
      return
    }
    if (prevKey === nextKey) {
      return
    }
    await nextTick()
    mainScrollEl.value?.scrollTo({ top: 0, behavior: 'auto' })
  },
)

const activeFilterCount = computed(() => {
  let count = 0

  if (props.listFilters.query) {
    count += 1
  }

  count += props.listFilters.projectIds.length
  count += props.listFilters.tagIds.length
  count += Number(props.listFilters.tagMode === 'all')
  count += Number(Boolean(props.listFilters.dateStart || props.listFilters.dateEnd))
  count += Number(props.listFilters.minMinutes !== null)
  count += Number(props.listFilters.maxMinutes !== null)
  count += Number(props.listFilters.untaggedOnly)
  count += Number(props.listFilters.notesState !== 'any')

  return count
})

const sidePanelMode = computed(() => (props.panelMode === 'closed' ? 'overview' : props.panelMode))
const shouldShowSessionPanel = computed(() => props.panelMode !== 'closed')
const shouldShowAside = computed(() => shouldShowSessionPanel.value || isFilterSheetOpen.value)

const handleOpenSearchSession = (timeBox: TimeBox) => {
  isFilterSheetOpen.value = false
  props.onOpenSession({
    day: timeBox.startTime ? new Date(timeBox.startTime.valueOf()) : undefined,
    sessionId: timeBox.id,
  })
}

watch(
  () => props.currentMode,
  () => {
    isFilterSheetOpen.value = false
  },
)

watch(
  () => props.panelMode,
  (mode) => {
    if (mode !== 'closed') {
      isFilterSheetOpen.value = false
    }
  },
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <SessionsWorkspaceHeader
      :anchor-date="anchorDate"
      :calendar-header-summary="calendarHeaderSummary"
      :current-mode="currentMode"
      :list-summary="listSummary"
      :mutation-error-message="mutationErrorMessage"
      :page-title="pageTitle"
      :session-view-items="sessionViewItems"
      @clear-filters="onClearFilters"
      @go-today="onGoToday"
      @navigate-period="onNavigatePeriod"
      @select-mode="onSelectMode"
    />

    <SessionsWorkspaceShell
      :aside-panel-class="'w-full min-w-0 max-w-full pt-0 pl-0'"
      :overlay-aside="shouldShowAside"
      @dismiss-aside="shouldShowSessionPanel ? onClosePanel() : (isFilterSheetOpen = false)"
    >
      <div ref="mainScrollEl" class="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4">
        <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div
            v-if="currentMode === 'search'"
            class="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface/92 px-4 py-3 shadow-control"
          >
            <div>
              <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Search</div>
              <div class="mt-1 text-sm font-semibold text-text">
                {{
                  activeFilterCount === 0
                    ? 'All filters cleared'
                    : `${activeFilterCount} active filters`
                }}
              </div>
            </div>
            <AppButton size="sm" variant="secondary" @click="isFilterSheetOpen = true">
              Filters
            </AppButton>
          </div>

          <template v-if="currentMode === 'day'">
            <ContainerCard
              v-if="visibleDayTimeBoxes.length === 0"
              class="border-dashed px-6 py-8 text-center shadow-none"
              padding="comfortable"
              variant="subtle"
            >
              <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">No sessions</div>
              <div class="mt-2 text-sm text-text-muted">No sessions on the selected day.</div>
              <div class="mt-4 flex justify-center">
                <AppButton @click="onAddSession">Add Session</AppButton>
              </div>
            </ContainerCard>

            <template v-else>
              <DaySessionsOverviewPanel
                :day="anchorDate"
                :project-by-id="projectById"
                :project-name-by-id="projectNameById"
                :selected-session-id="selectedSessionId"
                :show-day-summary="false"
                show-project-name
                :time-boxes="visibleDayTimeBoxes"
                use-project-card-styles
                @open-session="onOpenSession({ sessionId: $event })"
              />

              <div class="flex">
                <AppButton @click="onAddSession">Add Session</AppButton>
              </div>
            </template>
          </template>

          <ContainerCard
            v-else-if="filteredSessionListTimeBoxes.length === 0"
            class="border-dashed px-6 py-10 text-center shadow-none"
            padding="comfortable"
          >
            <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">No matches</div>
            <div class="mt-2 text-xl font-bold text-text">
              No sessions match the current filters
            </div>
            <p class="mt-3 text-sm text-text-muted">
              {{
                hideTags
                  ? 'Adjust the search, date range, project, or duration bounds to widen the results.'
                  : 'Adjust the search, date range, tags, or duration bounds to widen the results.'
              }}
            </p>
          </ContainerCard>

          <div v-else class="flex flex-col gap-3">
            <TimeBox
              v-for="item in filteredSessionListTimeBoxes"
              :id="item.id"
              :key="item.id"
              :highlight-tokens="listSearchTokens"
              interactive
              :selected="selectedSessionId === item.id"
              variant="overview"
              @open="handleOpenSearchSession(item)"
            />
          </div>
        </div>
      </div>

      <template #aside>
        <WorkspaceSidePanelFrame
          v-if="isFilterSheetOpen"
          body-class="bg-surface"
          body-padding-class="pb-4"
          overlay
        >
          <template #header>
            <div class="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div>
                <div class="text-xs tracking-[0.18em] text-text-subtle uppercase">Search</div>
                <div class="mt-1 text-xl font-bold text-text">Filters</div>
              </div>
              <button
                type="button"
                class="cursor-pointer rounded-md p-2 text-text-subtle hover:bg-overlay-inverse hover:text-text"
                aria-label="Close filters"
                @click="isFilterSheetOpen = false"
              >
                <CloseIcon />
              </button>
            </div>
          </template>

          <SessionListFilterPanel
            :filters="listFilters"
            :hide-tags="hideTags"
            :projects="Object.values(projectById)"
            :tags="sortedTags"
            @update-filters="onUpdateFilters"
          />
        </WorkspaceSidePanelFrame>

        <SessionsSidePanel
          v-else-if="shouldShowSessionPanel"
          :date-key="scratchpadDateKey"
          :day="anchorDate"
          :initial-end-time="initialEndTime"
          :initial-start-time="initialStartTime"
          :mode="sidePanelMode"
          overlay
          :persistent="false"
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :session-id="panelSessionId"
          :sessions-view-mode="currentMode"
          :time-boxes="visibleDayTimeBoxes"
          @back-to-overview="onBackToOverview"
          @close="onClosePanel"
          @created="onCreated"
          @open-session="onOpenSession({ sessionId: $event })"
          @show-overview="onShowOverview"
          @show-scratchpad="onShowScratchpad"
        />
      </template>
    </SessionsWorkspaceShell>
  </div>
</template>
