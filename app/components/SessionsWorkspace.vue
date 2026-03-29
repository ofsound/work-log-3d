<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { addDays } from '~~/shared/worklog'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import SessionsPhoneWorkspace from '~/components/SessionsPhoneWorkspace.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { usePhoneMode } from '~/composables/usePhoneMode'
import { useSessionsKeyboard } from '~/composables/useSessionsKeyboard'
import { useSessionsPanelState } from '~/composables/useSessionsPanelState'
import { useSessionsRouteState } from '~/composables/useSessionsRouteState'
import { useSessionsMutations } from '~/composables/useSessionsMutations'
import { useSessionsWorkspaceData } from '~/composables/useSessionsWorkspaceData'
import {
  PHONE_MODE_SUPPORTED_SESSIONS_VIEW_MODES,
  routeRequiresPhoneResolution,
} from '~/utils/phone-mode'
import { WORKSPACE_BODY_X_CLASS_NAME } from '~/utils/workspace-subheader'
import type { SessionsViewMode } from '~/utils/sessions-route-state'

const SESSION_VIEW_ITEMS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'search', label: 'Search' },
] satisfies ReadonlyArray<{ id: SessionsViewMode; label: string }>

let clearMutationError = () => {}

const routedState = useSessionsRouteState({
  clearError: () => clearMutationError(),
})
const data = useSessionsWorkspaceData({
  anchorDate: routedState.anchorDate,
  currentMode: routedState.currentMode,
  listFilters: routedState.listFilters,
})
const panel = useSessionsPanelState({
  anchorDate: routedState.anchorDate,
  currentMode: routedState.currentMode,
  resolvedTimeBoxes: data.resolvedTimeBoxes,
  visibleCalendarTimeBoxes: data.visibleCalendarTimeBoxes,
  visibleDayTimeBoxes: data.visibleDayTimeBoxes,
  updateRouteState: routedState.updateRouteState,
})
const mutations = useSessionsMutations({
  markCreatePreviewSaved: panel.markCreatePreviewSaved,
  openSessionPanel: panel.openSessionPanel,
})
clearMutationError = mutations.clearMutationError
const route = useRoute()
const { hasResolvedViewport, isPhoneMode } = usePhoneMode()

const { anchorDate, clearListFilters, currentMode, listFilters, updateListFilters } = routedState
const {
  calendarHeaderSummary,
  filteredSessionListTimeBoxes,
  hideTags,
  listSearchTokens,
  listSummary,
  projectById,
  projectNameById,
  sortedProjects,
  sortedTags,
  visibleCalendarTimeBoxes,
  visibleDayTimeBoxes,
  yearHeatmapMonths,
} = data
const {
  backToOverlayOverviewPanel,
  closePanel,
  createInitialEndTime,
  createInitialStartTime,
  createPreviewRange,
  handleOpenDay,
  isPersistentScratchpad,
  openMobileDayCreatePanel,
  openCreatePanel,
  openOverviewPanel,
  openScratchpadPanel,
  openSessionPanel,
  panelMode,
  panelSessionId,
  scratchpadDateKey,
  selectedSessionId,
  sessionsHeaderRef,
  sessionsSidePanelRef,
  shouldOverlaySidePanel,
} = panel
const { handlePanelCreated, mutationErrorMessage, persistSessionChange } = mutations

const pageTitle = computed(() => {
  if (currentMode.value !== 'year') {
    return routedState.pageTitle.value
  }

  const latestYear = yearHeatmapMonths.value[0]?.year
  const earliestYear = yearHeatmapMonths.value.at(-1)?.year

  if (!latestYear || !earliestYear || latestYear === earliestYear) {
    return String(latestYear ?? new Date().getFullYear())
  }

  return `${earliestYear}-${latestYear}`
})

const phoneSessionViewItems = computed(() =>
  SESSION_VIEW_ITEMS.filter((item) =>
    PHONE_MODE_SUPPORTED_SESSIONS_VIEW_MODES.includes(item.id as 'day' | 'search'),
  ),
)

const shouldBlockForPhoneResolution = computed(() => {
  if (
    !routeRequiresPhoneResolution({
      path: route.path,
      query: route.query as Record<string, string | string[] | undefined>,
    })
  ) {
    return false
  }

  return !hasResolvedViewport.value
})
const { showPending: shouldHoldForPhoneResolution } = useDelayedPending(
  shouldBlockForPhoneResolution,
)

useSessionsKeyboard({
  anchorDate: routedState.anchorDate,
  applyCalendarEscapeDismiss: panel.applyCalendarEscapeDismiss,
  currentMode: routedState.currentMode,
  goToday: async () => {
    if (routedState.currentMode.value === 'week' || routedState.currentMode.value === 'month') {
      await panel.closePanel()
    } else {
      await panel.flushScratchpadIfNeeded()
    }

    await routedState.goToday()
  },
  moveDaySelection: panel.moveDaySelection,
  openSelectedSession: panel.openSessionPanel,
  openSuggestedCreatePanel: panel.openSuggestedCreatePanel,
  selectedSessionId: panel.selectedSessionId,
  shiftDate: async (days) => {
    await routedState.updateRouteState({ date: addDays(routedState.anchorDate.value, days) })
  },
})

const handleModeChange = async (mode: SessionsViewMode) => {
  if (mode === routedState.currentMode.value) {
    return
  }

  await panel.flushScratchpadIfNeeded()
  panel.resetPanelState('closed')
  await routedState.changeMode(mode)
}

const handleNavigate = async (direction: -1 | 1) => {
  if (routedState.currentMode.value === 'week' || routedState.currentMode.value === 'month') {
    await panel.closePanel()
  } else {
    await panel.flushScratchpadIfNeeded()
  }

  await routedState.navigatePeriod(direction)
}

const handleGoToday = async () => {
  if (routedState.currentMode.value === 'week' || routedState.currentMode.value === 'month') {
    await panel.closePanel()
  } else {
    await panel.flushScratchpadIfNeeded()
  }

  await routedState.goToday()
}

const handleOpenSessionFromMonth = async (payload: { day: Date; sessionId: string }) => {
  await panel.openSessionPanel(payload.sessionId, { day: payload.day })
}
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldForPhoneResolution" />

  <SessionsPhoneWorkspace
    v-else-if="!shouldBlockForPhoneResolution && isPhoneMode"
    :anchor-date="anchorDate"
    :calendar-header-summary="calendarHeaderSummary"
    :current-mode="currentMode"
    :filtered-session-list-time-boxes="filteredSessionListTimeBoxes"
    :hide-tags="hideTags"
    :initial-end-time="createInitialEndTime"
    :initial-start-time="createInitialStartTime"
    :list-filters="listFilters"
    :list-search-tokens="listSearchTokens"
    :list-summary="listSummary"
    :mutation-error-message="mutationErrorMessage"
    :page-title="pageTitle"
    :panel-mode="panelMode"
    :panel-session-id="panelSessionId"
    :project-by-id="projectById"
    :project-name-by-id="projectNameById"
    :scratchpad-date-key="scratchpadDateKey"
    :selected-session-id="selectedSessionId"
    :session-view-items="phoneSessionViewItems"
    :sorted-tags="sortedTags"
    :visible-day-time-boxes="visibleDayTimeBoxes"
    :on-back-to-overview="backToOverlayOverviewPanel"
    :on-add-session="openMobileDayCreatePanel"
    :on-clear-filters="clearListFilters"
    :on-close-panel="closePanel"
    :on-created="handlePanelCreated"
    :on-go-today="handleGoToday"
    :on-navigate-period="handleNavigate"
    :on-open-session="({ day, sessionId }) => openSessionPanel(sessionId, { day })"
    :on-select-mode="handleModeChange"
    :on-show-overview="openOverviewPanel"
    :on-show-scratchpad="openScratchpadPanel"
    :on-update-filters="updateListFilters"
  />

  <div
    v-else-if="!shouldBlockForPhoneResolution"
    class="flex h-full min-h-0 flex-col overflow-hidden"
  >
    <div ref="sessionsHeaderRef" class="shrink-0">
      <SessionsWorkspaceHeader
        :anchor-date="anchorDate"
        :calendar-header-summary="calendarHeaderSummary"
        :current-mode="currentMode"
        :list-summary="listSummary"
        :mutation-error-message="mutationErrorMessage"
        :page-title="pageTitle"
        :session-view-items="SESSION_VIEW_ITEMS"
        @clear-filters="clearListFilters"
        @go-today="handleGoToday"
        @navigate-period="handleNavigate"
        @select-mode="handleModeChange"
      />
    </div>

    <SessionsWorkspaceShell
      :overlay-aside="shouldOverlaySidePanel"
      @dismiss-aside="panel.applyCalendarEscapeDismiss"
    >
      <WorkspaceSidebarLayout
        v-if="currentMode === 'search'"
        :content-body-class="
          ['flex flex-col gap-6 py-6 pb-2', WORKSPACE_BODY_X_CLASS_NAME].join(' ')
        "
      >
        <template #sidebar>
          <SessionListFilterPanel
            :filters="listFilters"
            :hide-tags="hideTags"
            :projects="sortedProjects"
            :tags="sortedTags"
            @update-filters="updateListFilters"
          />
        </template>

        <template #default>
          <ContainerCard
            v-if="filteredSessionListTimeBoxes.length === 0"
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

          <div v-else>
            <TimeBox
              v-for="item in filteredSessionListTimeBoxes"
              :id="item.id"
              :key="item.id"
              :highlight-tokens="listSearchTokens"
            />
          </div>
        </template>
      </WorkspaceSidebarLayout>

      <template v-else>
        <SessionsDayView
          v-if="currentMode === 'day'"
          :anchor-date="anchorDate"
          :create-preview-range="createPreviewRange"
          :scroll-align-target="sessionsHeaderRef"
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :time-boxes="visibleDayTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @open-scratchpad="openScratchpadPanel"
          @open-session="openSessionPanel"
        />

        <SessionsWeekView
          v-else-if="currentMode === 'week'"
          :anchor-date="anchorDate"
          :create-preview-range="createPreviewRange"
          :scroll-align-target="sessionsHeaderRef"
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @dismiss-calendar="panel.applyCalendarEscapeDismiss"
          @open-day="handleOpenDay"
          @open-session="openSessionPanel"
        />

        <SessionsYearView
          v-else-if="currentMode === 'year'"
          :months="yearHeatmapMonths"
          @open-day="handleOpenDay"
        />

        <SessionsMonthView
          v-else
          :anchor-date="anchorDate"
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :selected-date="currentMode === 'month' && panelMode !== 'closed' ? anchorDate : null"
          :selected-session-id="selectedSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @open-day="handleOpenDay"
          @open-session="handleOpenSessionFromMonth"
        />
      </template>

      <template #aside>
        <SessionsSidePanel
          v-if="panelMode !== 'closed'"
          ref="sessionsSidePanelRef"
          :day="anchorDate"
          :date-key="scratchpadDateKey"
          :initial-end-time="createInitialEndTime"
          :initial-start-time="createInitialStartTime"
          :mode="panelMode"
          :overlay="shouldOverlaySidePanel"
          :persistent="isPersistentScratchpad"
          :project-by-id="projectById"
          :project-name-by-id="projectNameById"
          :sessions-view-mode="currentMode"
          :selected-session-id="selectedSessionId"
          :session-id="panelSessionId"
          :time-boxes="visibleDayTimeBoxes"
          @back-to-overview="backToOverlayOverviewPanel"
          @close="closePanel"
          @created="handlePanelCreated"
          @open-session="openSessionPanel"
          @show-overview="openOverviewPanel"
          @show-scratchpad="openScratchpadPanel"
        />
      </template>
    </SessionsWorkspaceShell>
  </div>
</template>
