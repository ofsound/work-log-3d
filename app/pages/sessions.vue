<script setup lang="ts">
import { Timestamp, orderBy, query, where } from 'firebase/firestore'

import type { FirebaseProjectDocument, FirebaseTimeBoxDocument } from '~/utils/worklog-firebase'
import { toProjects, toTimeBoxes } from '~/utils/worklog-firebase'
import { buildSessionsRouteQuery, parseSessionsRouteState } from '~/utils/sessions-route-state'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  addMinutes,
  addDays,
  addMonths,
  formatToDatetimeLocal,
  getBufferedCalendarRange,
  getEndOfWeek,
  getIsoWeekNumber,
  getMonthGridRange,
  getStartOfWeek,
  getTimeBoxesForDay,
  getWorklogErrorMessage,
  setTimeOnDate,
  sortNamedEntities,
  sortTimeBoxesByStart,
} from '~~/shared/worklog'

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

interface SessionCreatePayload {
  startTime: Date
  endTime: Date
}

const route = useRoute()
const router = useRouter()

const repositories = useWorklogRepository()
const { timeBoxesCollection, projectsCollection } = useFirestoreCollections()

const allTimeBoxes = useCollection(timeBoxesCollection)
const allProjects = useCollection(projectsCollection)

const store = useStore()

const panelMode = ref<'closed' | 'day' | 'session' | 'create'>('closed')
const panelDate = ref<Date | null>(null)
const panelSessionId = ref('')
const createRange = ref<SessionCreatePayload | null>(null)
const mutationErrorMessage = ref('')

const routeState = computed(() =>
  parseSessionsRouteState(route.query as Record<string, string | string[] | undefined>),
)
const currentMode = computed(() => routeState.value.mode)
const anchorDate = computed(() => routeState.value.date)

const sortedTimeBoxes = computed(() => {
  return sortTimeBoxesByStart(
    toTimeBoxes(allTimeBoxes.value as FirebaseTimeBoxDocument[]),
    store.sortOrderReversed ? 'desc' : 'asc',
  )
})

const calendarQuery = computed(() => {
  const bufferedRange = getBufferedCalendarRange(
    currentMode.value === 'month' ? 'month' : 'week',
    anchorDate.value,
  )

  return query(
    timeBoxesCollection,
    where('startTime', '<', Timestamp.fromDate(bufferedRange.end)),
    where('endTime', '>', Timestamp.fromDate(bufferedRange.start)),
    orderBy('startTime', 'asc'),
    orderBy('endTime', 'asc'),
  )
})

const calendarTimeBoxes = useCollection(calendarQuery)

const visibleCalendarRange = computed(() =>
  currentMode.value === 'week'
    ? {
        start: getStartOfWeek(anchorDate.value),
        end: getEndOfWeek(anchorDate.value),
      }
    : getMonthGridRange(anchorDate.value),
)

const visibleCalendarTimeBoxes = computed(() =>
  toTimeBoxes(calendarTimeBoxes.value as FirebaseTimeBoxDocument[]).filter((timeBox) => {
    if (!timeBox.startTime || !timeBox.endTime) {
      return false
    }

    return (
      timeBox.startTime.valueOf() < visibleCalendarRange.value.end.valueOf() &&
      timeBox.endTime.valueOf() > visibleCalendarRange.value.start.valueOf()
    )
  }),
)

const sortedProjects = computed(() =>
  sortNamedEntities(toProjects(allProjects.value as FirebaseProjectDocument[])),
)

const projectNameById = computed(() =>
  Object.fromEntries(sortedProjects.value.map((project) => [project.id, project.name])),
)

const panelDayTimeBoxes = computed(() =>
  panelDate.value ? getTimeBoxesForDay(visibleCalendarTimeBoxes.value, panelDate.value) : [],
)

const createInitialStartTime = computed(() =>
  createRange.value ? formatToDatetimeLocal(createRange.value.startTime) : '',
)
const createInitialEndTime = computed(() =>
  createRange.value ? formatToDatetimeLocal(createRange.value.endTime) : '',
)

const weekTitle = computed(() => {
  const start = getStartOfWeek(anchorDate.value)
  const end = addDays(getEndOfWeek(anchorDate.value), -1)

  return `${start.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString([], {
    month: start.getMonth() === end.getMonth() ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
})

const pageTitle = computed(() => {
  if (currentMode.value === 'list') {
    return 'Sessions'
  }

  if (currentMode.value === 'week') {
    return weekTitle.value
  }

  return anchorDate.value.toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
})

const pageSubtitle = computed(() => {
  if (currentMode.value === 'week') {
    return `Week ${getIsoWeekNumber(anchorDate.value)}`
  }

  if (currentMode.value === 'month') {
    return 'Month view'
  }

  return `${sortedTimeBoxes.value.length} total sessions`
})

const updateRouteState = async (nextState: Partial<ReturnType<typeof parseSessionsRouteState>>) => {
  mutationErrorMessage.value = ''

  await router.replace({
    query: buildSessionsRouteQuery(
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
  panelDate.value = null
  panelSessionId.value = ''
  createRange.value = null
}

const openDayPanel = (day: Date) => {
  panelMode.value = 'day'
  panelDate.value = day
  panelSessionId.value = ''
  createRange.value = null
}

const openSessionPanel = (sessionId: string) => {
  panelMode.value = 'session'
  panelSessionId.value = sessionId
  createRange.value = null
}

const openCreatePanel = (range: SessionCreatePayload) => {
  panelMode.value = 'create'
  panelDate.value = range.startTime
  panelSessionId.value = ''
  createRange.value = range
}

const openDayCreatePanel = () => {
  if (!panelDate.value) {
    return
  }

  const startTime = setTimeOnDate(panelDate.value, 9, 0)
  openCreatePanel({ startTime, endTime: addMinutes(startTime, 60) })
}

const handleModeChange = async (mode: 'list' | 'week' | 'month') => {
  if (mode === currentMode.value) {
    return
  }

  await updateRouteState({ mode })

  if (mode === 'list') {
    closePanel()
  }
}

const handleNavigate = async (direction: -1 | 1) => {
  if (currentMode.value === 'week') {
    await updateRouteState({ date: addDays(anchorDate.value, direction * 7) })
    return
  }

  await updateRouteState({ date: addMonths(anchorDate.value, direction) })
}

const handleGoToday = async () => {
  await updateRouteState({ date: new Date() })
}

const persistSessionChange = async ({ id, input, duplicate }: SessionChangePayload) => {
  try {
    mutationErrorMessage.value = ''

    if (duplicate) {
      const createdId = await repositories.timeBoxes.create(input)
      openSessionPanel(createdId)
      return
    }

    await repositories.timeBoxes.update(id, input)
    openSessionPanel(id)
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
  }
}

const handlePanelCreated = (sessionId: string) => {
  openSessionPanel(sessionId)
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
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="border-b border-border px-6 py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="text-3xl font-bold tracking-tight">{{ pageTitle }}</div>
          <div class="mt-1 text-sm tracking-[0.22em] text-text-subtle uppercase">
            {{ pageSubtitle }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
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
                currentMode === 'week'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('week')"
            >
              Week
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                currentMode === 'month'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('month')"
            >
              Month
            </button>
          </div>

          <div v-if="currentMode !== 'list'" class="flex items-center gap-2">
            <button
              class="cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleNavigate(-1)"
            >
              Prev
            </button>
            <button
              class="cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleGoToday"
            >
              Today
            </button>
            <button
              class="cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-3 py-2 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleNavigate(1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <p v-if="mutationErrorMessage" class="mt-4 text-sm text-danger">
        {{ mutationErrorMessage }}
      </p>
    </div>

    <div v-if="currentMode === 'list'" class="h-full overflow-auto px-11 pt-8 pb-4">
      <TimeBox v-for="item in sortedTimeBoxes" :id="item.id" :key="item.id" />
    </div>

    <div v-else class="flex min-h-0 flex-1">
      <div class="min-w-0 flex-1 px-6 py-6">
        <SessionsWeekView
          v-if="currentMode === 'week'"
          :anchor-date="anchorDate"
          :project-name-by-id="projectNameById"
          :selected-session-id="panelSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @open-day="openDayPanel"
          @open-session="openSessionPanel"
        />

        <SessionsMonthView
          v-else
          :anchor-date="anchorDate"
          :project-name-by-id="projectNameById"
          :selected-session-id="panelSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @open-day="openDayPanel"
          @open-session="openSessionPanel"
        />
      </div>

      <SessionsSidePanel
        v-if="panelMode !== 'closed'"
        :day="panelDate ?? undefined"
        :day-time-boxes="panelDayTimeBoxes"
        :initial-end-time="createInitialEndTime"
        :initial-start-time="createInitialStartTime"
        :mode="panelMode"
        :project-name-by-id="projectNameById"
        :session-id="panelSessionId"
        @close="closePanel"
        @create-session="openDayCreatePanel"
        @created="handlePanelCreated"
        @open-session="openSessionPanel"
      />
    </div>
  </div>
</template>
