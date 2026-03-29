<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import PhoneRouteLoading from '~/components/PhoneRouteLoading.vue'
import ProjectPhoneWorkspace from '~/components/ProjectPhoneWorkspace.vue'
import { useDelayedPending } from '~/composables/useDelayedPending'
import { usePhoneMode } from '~/composables/usePhoneMode'
import { getProjectBadgeStyle, getProjectModeToggleStyles } from '~/utils/project-color-styles'
import {
  PROJECT_WORKSPACE_TABS,
  buildProjectWorkspaceLocation,
  buildProjectRouteQuery,
  parseProjectRouteState,
  type ProjectViewMode,
  type ProjectWorkspaceMode,
} from '~/utils/project-route-state'
import { routeRequiresPhoneResolution } from '~/utils/phone-mode'
import {
  WORKSPACE_BODY_CONTENT_CLASS_NAME,
  WORKSPACE_BODY_X_CLASS_NAME,
} from '~/utils/workspace-subheader'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  buildYearHeatmapMonths,
  formatDateKey,
  getTimeBoxesForDay,
  getTimeBoxesForInclusiveDayRange,
  getTotalDurationLabel,
  getWorklogErrorMessage,
  groupTimeBoxesByStartDay,
  sortTimeBoxesByStart,
} from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

const { projectsCollection, timeBoxesCollection } = useFirestoreCollections()

const props = defineProps({
  id: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const { hasResolvedViewport, isPhoneMode } = usePhoneMode()

const projectPathSegment = computed(() => {
  const p = route.params.id
  const raw = Array.isArray(p) ? p[0] : p
  return raw ?? ''
})
const repositories = useWorklogRepository()
const projectOverviewSortDirection = 'desc'

const rawProjectSource = computed(() =>
  projectsCollection.value ? doc(projectsCollection.value, props.id) : null,
)
const rawProject = useDocument(rawProjectSource, {
  ssrKey: `project-overview-${props.id}`,
})
const projectTimeBoxesQuery = computed(() =>
  timeBoxesCollection.value
    ? query(timeBoxesCollection.value, where('project', '==', props.id))
    : null,
)
const timeBoxes = useCollection(projectTimeBoxesQuery, {
  ssrKey: `project-timeboxes-${props.id}`,
})

const panelMode = ref<'closed' | 'day' | 'session'>('closed')
const panelSessionId = ref('')
const selectedSessionId = ref('')
const mutationErrorMessage = ref('')

const isWideViewport = useMediaQuery('(min-width: 1024px)', false)
const shouldOverlayProjectCalendarPanel = computed(
  () => isWideViewport.value && currentMode.value === 'calendar' && panelMode.value !== 'closed',
)

const routeState = computed(() =>
  parseProjectRouteState(route.query as Record<string, string | string[] | undefined>),
)
const currentMode = computed(() => routeState.value.mode)
const selectedDate = computed(() => routeState.value.date)

const rawProjectTimeBoxes = computed(() =>
  toTimeBoxes(timeBoxes.value as FirebaseTimeBoxDocument[]),
)
const projectTimeBoxes = computed(() =>
  sortTimeBoxesByStart(rawProjectTimeBoxes.value, projectOverviewSortDirection),
)
const project = computed(() =>
  rawProject.value ? toProject(rawProject.value as FirebaseProjectDocument) : null,
)
const projectOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(projectTimeBoxes.value))
const projectTimeBoxesTotalDuration = computed(() =>
  getTotalDurationLabel(rawProjectTimeBoxes.value),
)
const calendarMonths = computed(() => buildYearHeatmapMonths(rawProjectTimeBoxes.value, new Date()))
const calendarSidebarTimeBoxes = computed(() => {
  if (selectedDate.value == null) {
    return []
  }

  const end = routeState.value.dateEnd
  if (end != null && formatDateKey(end) !== formatDateKey(selectedDate.value)) {
    return getTimeBoxesForInclusiveDayRange(rawProjectTimeBoxes.value, selectedDate.value, end)
  }

  return getTimeBoxesForDay(rawProjectTimeBoxes.value, selectedDate.value)
})
const modeToggleStyles = computed(() => {
  if (!project.value) {
    return undefined
  }

  const styles = getProjectModeToggleStyles(project.value.colors)

  return {
    container: styles.container as Record<string, string>,
    activeButton: styles.activeButton as Record<string, string>,
    inactiveButton: styles.inactiveButton as Record<string, string>,
  }
})
const durationBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)
const lastActivityLabel = computed(() => {
  const last = rawProjectTimeBoxes.value
    .filter((tb) => tb.startTime)
    .sort((a, b) => (b.startTime?.valueOf() ?? 0) - (a.startTime?.valueOf() ?? 0))[0]?.startTime
  return last
    ? last.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : null
})
const headerBadges = computed(() => {
  const badges: {
    compactBelowSm?: boolean
    hideBelowSm?: boolean
    label: string
    style?: Record<string, string>
    variant?: 'outline' | 'accent'
  }[] = [
    {
      compactBelowSm: true,
      label: `${projectTimeBoxesTotalDuration.value} hrs`,
      style: durationBadgeStyle.value as Record<string, string>,
    },
    {
      compactBelowSm: true,
      label: `${rawProjectTimeBoxes.value.length} sessions`,
      variant: 'outline',
    },
  ]
  if (lastActivityLabel.value) {
    badges.push({
      hideBelowSm: true,
      label: `Last activity ${lastActivityLabel.value}`,
      variant: 'outline',
    })
  }
  return badges
})
const projectHeaderTabs = computed(() => (isPhoneMode.value ? [] : PROJECT_WORKSPACE_TABS))
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

const hasSameQueryState = (
  left: Record<string, string | string[] | undefined>,
  right: Record<string, string | string[] | undefined>,
) => {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) {
      return false
    }

    const leftValue = left[key]
    const rightValue = right[key]

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return JSON.stringify(leftValue) === JSON.stringify(rightValue)
    }

    return leftValue === rightValue
  })
}

const updateRouteState = async (
  nextState: Partial<ReturnType<typeof parseProjectRouteState>>,
  options: {
    history?: 'push' | 'replace'
  } = {},
) => {
  mutationErrorMessage.value = ''

  const nextQuery = buildProjectRouteQuery(
    {
      ...routeState.value,
      ...nextState,
    },
    route.query as Record<string, string | string[] | undefined>,
  )
  const currentQuery = route.query as Record<string, string | string[] | undefined>

  if (hasSameQueryState(currentQuery, nextQuery)) {
    return
  }

  const navigate = options.history === 'push' ? router.push : router.replace

  await navigate({
    query: nextQuery,
  })
}

const closePanel = () => {
  panelMode.value = 'closed'
  panelSessionId.value = ''
  selectedSessionId.value = ''
}

const handleModeChange = async (mode: ProjectViewMode) => {
  if (mode === currentMode.value) {
    return
  }

  closePanel()
  await updateRouteState({ mode }, { history: 'push' })
}

const handleWorkspaceModeSelect = async (mode: ProjectWorkspaceMode) => {
  if (mode === 'edit') {
    closePanel()
    await router.push(
      buildProjectWorkspaceLocation(
        projectPathSegment.value,
        mode,
        routeState.value,
        route.query as Record<string, string | string[] | undefined>,
      ),
    )
    return
  }

  await handleModeChange(mode)
}

const openDayPanel = async (day: Date) => {
  const dayBoxes = getTimeBoxesForDay(rawProjectTimeBoxes.value, day)
  if (dayBoxes.length === 0) {
    closePanel()
    await updateRouteState({ mode: 'calendar', date: day, dateEnd: null })
    return
  }

  selectedSessionId.value = ''
  panelSessionId.value = ''
  panelMode.value = 'day'
  await updateRouteState({ mode: 'calendar', date: day, dateEnd: null })
}

const openDayRangePanel = async (payload: { start: Date; end: Date }) => {
  const { start, end } = payload
  if (formatDateKey(start) === formatDateKey(end)) {
    await openDayPanel(start)
    return
  }

  selectedSessionId.value = ''
  panelSessionId.value = ''
  panelMode.value = 'day'
  await updateRouteState({
    mode: 'calendar',
    date: start,
    dateEnd: end,
  })
}

const openSessionPanel = async ({ day, sessionId }: { day: Date; sessionId: string }) => {
  selectedSessionId.value = sessionId
  panelSessionId.value = sessionId
  panelMode.value = 'session'
  await updateRouteState({ mode: 'calendar', date: day, dateEnd: null })
}

const openSelectedDayPanel = () => {
  selectedSessionId.value = ''
  panelSessionId.value = ''
  panelMode.value = 'day'
}

const openSessionFromDayPanel = (sessionId: string) => {
  selectedSessionId.value = sessionId
  panelSessionId.value = sessionId
  panelMode.value = 'session'
}

const persistSessionChange = async ({ id, input, duplicate }: SessionChangePayload) => {
  try {
    mutationErrorMessage.value = ''

    if (duplicate) {
      const createdId = await repositories.timeBoxes.create(input)
      await openSessionPanel({
        day: input.startTime,
        sessionId: createdId,
      })
      return
    }

    await repositories.timeBoxes.update(id, input)
    await openSessionPanel({
      day: input.startTime,
      sessionId: id,
    })
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
  }
}

watch(
  currentMode,
  (mode) => {
    if (mode === 'list') {
      closePanel()
    }
  },
  { immediate: true },
)

watch(
  () => selectedDate.value?.valueOf() ?? null,
  () => {
    if (panelMode.value === 'day') {
      selectedSessionId.value = ''
    }
  },
)

watch(rawProjectTimeBoxes, (timeBoxList) => {
  if (!panelSessionId.value) {
    return
  }

  if (!timeBoxList.some((timeBox) => timeBox.id === panelSessionId.value)) {
    if (currentMode.value === 'calendar') {
      openSelectedDayPanel()
      return
    }

    closePanel()
  }
})

const isEscapeTargetInEditableField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

const clearCalendarSelectionFromEscape = async () => {
  if (currentMode.value !== 'calendar') {
    return
  }

  closePanel()
  await updateRouteState({ date: null, dateEnd: null })
}

const handleProjectOverviewKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') {
    return
  }

  if (isEscapeTargetInEditableField(event.target)) {
    return
  }

  if (currentMode.value !== 'calendar') {
    return
  }

  if (panelMode.value === 'closed' && routeState.value.date === null) {
    return
  }

  event.preventDefault()
  void clearCalendarSelectionFromEscape()
}

onMounted(() => {
  window.addEventListener('keydown', handleProjectOverviewKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleProjectOverviewKeydown)
})
</script>

<template>
  <PhoneRouteLoading v-if="shouldHoldForPhoneResolution" />

  <div
    v-else-if="!shouldBlockForPhoneResolution"
    class="flex h-full min-h-0 flex-col overflow-hidden"
  >
    <ProjectWorkspaceHeader
      :active-mode="currentMode"
      :badges="headerBadges"
      compact-title-below-sm
      :error-message="mutationErrorMessage"
      :mode-toggle-styles="modeToggleStyles"
      :tabs="projectHeaderTabs"
      :title="project?.name ?? 'Loading project'"
      @select-mode="handleWorkspaceModeSelect"
    />

    <ProjectPhoneWorkspace
      v-if="isPhoneMode"
      :grouped-time-boxes="projectOverviewDayObjects"
      :project="project"
    />

    <SessionsWorkspaceShell
      v-else
      :overlay-aside="shouldOverlayProjectCalendarPanel"
      @dismiss-aside="closePanel"
    >
      <div
        v-if="currentMode === 'list'"
        :class="['flex-1 overflow-auto pt-8 pb-6', WORKSPACE_BODY_X_CLASS_NAME]"
      >
        <div :class="WORKSPACE_BODY_CONTENT_CLASS_NAME">
          <ProjectOverviewDay
            v-for="(item, index) in projectOverviewDayObjects"
            :key="index"
            :project-colors="project?.colors"
            :project-overview-day-data="item"
          />
        </div>
      </div>

      <ProjectCalendarView
        v-else
        :months="calendarMonths"
        :project="project"
        :selected-date="selectedDate"
        :selected-range-end="routeState.dateEnd"
        :selected-session-id="selectedSessionId"
        :time-boxes="rawProjectTimeBoxes"
        @change-session="persistSessionChange"
        @open-day="openDayPanel"
        @open-session="openSessionPanel"
        @select-day-range="openDayRangePanel"
      />

      <template #aside>
        <ProjectCalendarSidebar
          v-if="currentMode === 'calendar' && panelMode !== 'closed'"
          :day="selectedDate ?? new Date()"
          :mode="panelMode === 'session' ? 'session' : 'day'"
          :overlay="shouldOverlayProjectCalendarPanel"
          :project="project"
          :range-end-day="routeState.dateEnd"
          :selected-session-id="selectedSessionId"
          :session-id="panelSessionId"
          :time-boxes="calendarSidebarTimeBoxes"
          @back-to-day="openSelectedDayPanel"
          @close="closePanel"
          @open-session="openSessionFromDayPanel"
        />
      </template>
    </SessionsWorkspaceShell>
  </div>
</template>
