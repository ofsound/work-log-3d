<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import {
  getProjectBadgeStyle,
  getProjectWorkspaceModeToggleStyles,
} from '~/utils/project-color-styles'
import {
  buildProjectWorkspaceLocation,
  buildProjectRouteQuery,
  parseProjectRouteState,
  type ProjectViewMode,
  type ProjectWorkspaceMode,
} from '~/utils/project-route-state'
import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProject, toTimeBoxes } from '~/utils/worklog-firebase'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  buildYearHeatmapMonths,
  getTimeBoxesForDay,
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

const projectPathSegment = computed(() => {
  const p = route.params.id
  const raw = Array.isArray(p) ? p[0] : p
  return raw ?? ''
})
const repositories = useWorklogRepository()
const store = useStore()

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

const isDesktop = useMediaQuery('(min-width: 1024px)', false)
const shouldOverlayProjectCalendarPanel = computed(
  () => isDesktop.value && currentMode.value === 'calendar' && panelMode.value !== 'closed',
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
  sortTimeBoxesByStart(rawProjectTimeBoxes.value, store.sortOrderReversed ? 'desc' : 'asc'),
)
const project = computed(() =>
  rawProject.value ? toProject(rawProject.value as FirebaseProjectDocument) : null,
)
const projectOverviewDayObjects = computed(() => groupTimeBoxesByStartDay(projectTimeBoxes.value))
const projectTimeBoxesTotalDuration = computed(() =>
  getTotalDurationLabel(rawProjectTimeBoxes.value),
)
const calendarMonths = computed(() => buildYearHeatmapMonths(rawProjectTimeBoxes.value, new Date()))
const selectedDayTimeBoxes = computed(() =>
  selectedDate.value == null
    ? []
    : getTimeBoxesForDay(rawProjectTimeBoxes.value, selectedDate.value),
)
const modeToggleStyles = computed(() => {
  if (!project.value) {
    return undefined
  }

  const styles = getProjectWorkspaceModeToggleStyles(project.value.colors)

  return {
    container: styles.container as Record<string, string>,
    activeButton: styles.activeButton as Record<string, string>,
    inactiveButton: styles.inactiveButton as Record<string, string>,
  }
})
const durationBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)
const headerBadges = computed(() => [
  {
    label: `${projectTimeBoxesTotalDuration.value} hrs`,
    style: durationBadgeStyle.value as Record<string, string>,
  },
  {
    label: `${rawProjectTimeBoxes.value.length} sessions`,
    variant: 'outline' as const,
  },
])

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
    await updateRouteState({ mode: 'calendar', date: day })
    return
  }

  selectedSessionId.value = ''
  panelSessionId.value = ''
  panelMode.value = 'day'
  await updateRouteState({ mode: 'calendar', date: day })
}

const openSessionPanel = async ({ day, sessionId }: { day: Date; sessionId: string }) => {
  selectedSessionId.value = sessionId
  panelSessionId.value = sessionId
  panelMode.value = 'session'
  await updateRouteState({ mode: 'calendar', date: day })
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
  await updateRouteState({ date: null })
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
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <ProjectWorkspaceHeader
      :active-mode="currentMode"
      :badges="headerBadges"
      :error-message="mutationErrorMessage"
      :mode-toggle-styles="modeToggleStyles"
      :title="project?.name ?? 'Loading project'"
      @select-mode="handleWorkspaceModeSelect"
    />

    <SessionsWorkspaceShell :overlay-aside="shouldOverlayProjectCalendarPanel">
      <div v-if="currentMode === 'list'" class="flex-1 overflow-auto px-11 pt-8">
        <ProjectOverviewDay
          v-for="(item, index) in projectOverviewDayObjects"
          :key="index"
          :project-colors="project?.colors"
          :project-overview-day-data="item"
        />
      </div>

      <ProjectCalendarView
        v-else
        :months="calendarMonths"
        :project="project"
        :selected-date="selectedDate"
        :selected-session-id="selectedSessionId"
        :time-boxes="rawProjectTimeBoxes"
        @change-session="persistSessionChange"
        @open-day="openDayPanel"
        @open-session="openSessionPanel"
      />

      <template #aside>
        <ProjectCalendarSidebar
          v-if="currentMode === 'calendar' && panelMode !== 'closed'"
          :day="selectedDate ?? new Date()"
          :mode="panelMode === 'session' ? 'session' : 'day'"
          :overlay="shouldOverlayProjectCalendarPanel"
          :project="project"
          :selected-session-id="selectedSessionId"
          :session-id="panelSessionId"
          :time-boxes="selectedDayTimeBoxes"
          @back-to-day="openSelectedDayPanel"
          @close="closePanel"
          @open-session="openSessionFromDayPanel"
        />
      </template>
    </SessionsWorkspaceShell>
  </div>
</template>
