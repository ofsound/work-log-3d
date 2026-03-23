<script setup lang="ts">
import { doc, query, where } from 'firebase/firestore'

import { getProjectBadgeStyle, getProjectHeaderStyle } from '~/utils/project-color-styles'
import {
  buildProjectRouteQuery,
  parseProjectRouteState,
  type ProjectViewMode,
} from '~/utils/project-route-state'
import { getProjectEditPath } from '~/utils/worklog-routes'
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
  getTimeBoxesForDay(rawProjectTimeBoxes.value, selectedDate.value),
)
const headerStyle = computed(() =>
  project.value ? getProjectHeaderStyle(project.value.colors) : {},
)
const durationBadgeStyle = computed(() =>
  project.value ? getProjectBadgeStyle(project.value.colors) : {},
)

const updateRouteState = async (nextState: Partial<ReturnType<typeof parseProjectRouteState>>) => {
  mutationErrorMessage.value = ''

  await router.replace({
    query: buildProjectRouteQuery(
      {
        ...routeState.value,
        ...nextState,
      },
      route.query as Record<string, string | string[] | undefined>,
    ),
  })
}

const closePanel = () => {
  panelMode.value = 'closed'
  panelSessionId.value = ''
  selectedSessionId.value = ''
}

const openProjectEditor = async () => {
  await router.push(getProjectEditPath(props.id))
}

const handleModeChange = async (mode: ProjectViewMode) => {
  if (mode === currentMode.value) {
    return
  }

  closePanel()
  await updateRouteState({ mode })
}

const openDayPanel = async (day: Date) => {
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
  () => selectedDate.value.valueOf(),
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
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div
      class="relative z-10 border-b border-border px-6 py-5 shadow-overview"
      :style="headerStyle"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <div class="text-3xl font-bold tracking-tight">{{ project?.name }}</div>
          <div
            class="relative top-px w-max rounded-md border px-1.5 py-0.5 pt-px font-data text-sm tracking-wide"
            :style="durationBadgeStyle"
          >
            {{ projectTimeBoxesTotalDuration }} hrs
          </div>
        </div>

        <div class="flex flex-col items-start gap-3 sm:items-end">
          <div
            class="inline-flex rounded-xl border border-border bg-surface-strong p-1 shadow-control"
          >
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                currentMode === 'list'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('list')"
            >
              List
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                currentMode === 'calendar'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('calendar')"
            >
              Calendar
            </button>
          </div>

          <button
            type="button"
            class="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase hover:bg-white/10"
            @click="openProjectEditor"
          >
            Edit Project
          </button>
        </div>
      </div>

      <p v-if="mutationErrorMessage" class="mt-4 text-sm text-danger">
        {{ mutationErrorMessage }}
      </p>
    </div>

    <SessionsWorkspaceShell>
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
          :day="selectedDate"
          :mode="panelMode === 'session' ? 'session' : 'day'"
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
