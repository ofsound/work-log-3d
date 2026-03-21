<script setup lang="ts">
import { Timestamp, orderBy, query, where } from 'firebase/firestore'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { toProjects, toTags, toTimeBoxes } from '~/utils/worklog-firebase'
import { buildSessionsRouteQuery, parseSessionsRouteState } from '~/utils/sessions-route-state'
import type { TimeBoxInput } from '~~/shared/worklog'
import {
  addDays,
  addMinutes,
  addMonths,
  formatToDatetimeLocal,
  getBufferedCalendarRange,
  getDayRange,
  getEndOfWeek,
  getIsoWeekNumber,
  getMonthGridRange,
  getStartOfWeek,
  getTimeBoxDurationMinutes,
  getTimeBoxesForDay,
  getTotalDurationLabel,
  getWorklogErrorMessage,
  isSameDay,
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
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const allTimeBoxes = useCollection(timeBoxesCollection)
const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const store = useStore()

const panelMode = ref<'closed' | 'session' | 'create'>('closed')
const panelDate = ref<Date | null>(null)
const panelSessionId = ref('')
const selectedSessionId = ref('')
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

const calendarMode = computed(() =>
  currentMode.value === 'month' ? 'month' : currentMode.value === 'week' ? 'week' : 'day',
)

const calendarQuery = computed(() => {
  const bufferedRange = getBufferedCalendarRange(calendarMode.value, anchorDate.value)

  return query(
    timeBoxesCollection,
    where('startTime', '<', Timestamp.fromDate(bufferedRange.end)),
    where('endTime', '>', Timestamp.fromDate(bufferedRange.start)),
    orderBy('startTime', 'asc'),
    orderBy('endTime', 'asc'),
  )
})

const calendarTimeBoxes = useCollection(calendarQuery)

const visibleCalendarRange = computed(() => {
  if (currentMode.value === 'week') {
    return {
      start: getStartOfWeek(anchorDate.value),
      end: getEndOfWeek(anchorDate.value),
    }
  }

  if (currentMode.value === 'month') {
    return getMonthGridRange(anchorDate.value)
  }

  return getDayRange(anchorDate.value)
})

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
const sortedTags = computed(() => sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[])))

const projectNameById = computed(() =>
  Object.fromEntries(sortedProjects.value.map((project) => [project.id, project.name])),
)
const tagNameById = computed(() =>
  Object.fromEntries(sortedTags.value.map((tag) => [tag.id, tag.name])),
)

const visibleDayTimeBoxes = computed(() =>
  getTimeBoxesForDay(visibleCalendarTimeBoxes.value, anchorDate.value),
)

const createInitialStartTime = computed(() =>
  createRange.value ? formatToDatetimeLocal(createRange.value.startTime) : '',
)
const createInitialEndTime = computed(() =>
  createRange.value ? formatToDatetimeLocal(createRange.value.endTime) : '',
)

const daySummary = computed(() => ({
  count: visibleDayTimeBoxes.value.length,
  durationLabel: getTotalDurationLabel(visibleDayTimeBoxes.value),
  projectCount: new Set(visibleDayTimeBoxes.value.map((timeBox) => timeBox.project)).size,
}))

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
  if (currentMode.value === 'day') {
    return anchorDate.value.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (currentMode.value === 'week') {
    return weekTitle.value
  }

  if (currentMode.value === 'month') {
    return anchorDate.value.toLocaleDateString([], {
      month: 'long',
      year: 'numeric',
    })
  }

  return 'Sessions'
})

const pageSubtitle = computed(() => {
  if (currentMode.value === 'day') {
    return 'Focused day view'
  }

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
  panelSessionId.value = ''
  createRange.value = null
}

const selectSession = (sessionId: string) => {
  selectedSessionId.value = sessionId
}

const openSessionPanel = (sessionId: string) => {
  selectSession(sessionId)
  panelMode.value = 'session'
  panelSessionId.value = sessionId
  createRange.value = null
}

const openCreatePanel = (range: SessionCreatePayload) => {
  panelMode.value = 'create'
  panelDate.value = range.startTime
  panelSessionId.value = ''
  selectedSessionId.value = ''
  createRange.value = range
}

const roundToSnapMinutes = (date: Date) => {
  const next = new Date(date.valueOf())
  next.setSeconds(0, 0)
  next.setMinutes(Math.round(next.getMinutes() / 10) * 10)
  return next
}

const getSelectedDayTimeBox = () =>
  visibleDayTimeBoxes.value.find((timeBox) => timeBox.id === selectedSessionId.value) ?? null

const openSuggestedCreatePanel = () => {
  const selectedTimeBox = getSelectedDayTimeBox()
  const defaultStart = isSameDay(anchorDate.value, new Date())
    ? roundToSnapMinutes(new Date())
    : setTimeOnDate(anchorDate.value, 9, 0)

  const startTime = selectedTimeBox?.startTime
    ? new Date(selectedTimeBox.startTime.valueOf())
    : defaultStart
  const durationMinutes = selectedTimeBox ? getTimeBoxDurationMinutes(selectedTimeBox) || 60 : 60

  openCreatePanel({
    startTime,
    endTime: addMinutes(startTime, durationMinutes),
  })
}

const handleModeChange = async (mode: 'day' | 'week' | 'month' | 'list') => {
  if (mode === currentMode.value) {
    return
  }

  closePanel()
  await updateRouteState({ mode })
}

const handleOpenDay = async (day: Date) => {
  closePanel()
  await updateRouteState({ mode: 'day', date: day })
}

const handleNavigate = async (direction: -1 | 1) => {
  if (currentMode.value === 'day') {
    await updateRouteState({ date: addDays(anchorDate.value, direction) })
    return
  }

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

const moveDaySelection = (direction: -1 | 1) => {
  if (visibleDayTimeBoxes.value.length === 0) {
    return
  }

  const currentIndex = visibleDayTimeBoxes.value.findIndex(
    (timeBox) => timeBox.id === selectedSessionId.value,
  )

  if (currentIndex === -1) {
    selectSession(
      direction > 0
        ? visibleDayTimeBoxes.value[0]!.id
        : visibleDayTimeBoxes.value[visibleDayTimeBoxes.value.length - 1]!.id,
    )
    return
  }

  const nextIndex =
    (currentIndex + direction + visibleDayTimeBoxes.value.length) % visibleDayTimeBoxes.value.length

  selectSession(visibleDayTimeBoxes.value[nextIndex]!.id)
}

const isEditableTarget = (event: KeyboardEvent) => {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const handleDayKeyboard = (event: KeyboardEvent) => {
  if (currentMode.value !== 'day' || isEditableTarget(event) || event.metaKey || event.ctrlKey) {
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void updateRouteState({ date: addDays(anchorDate.value, event.shiftKey ? -7 : -1) })
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    void updateRouteState({ date: addDays(anchorDate.value, event.shiftKey ? 7 : 1) })
    return
  }

  if (event.key.toLowerCase() === 't') {
    event.preventDefault()
    void handleGoToday()
    return
  }

  if (event.key.toLowerCase() === 'j') {
    event.preventDefault()
    moveDaySelection(1)
    return
  }

  if (event.key.toLowerCase() === 'k') {
    event.preventDefault()
    moveDaySelection(-1)
    return
  }

  if (event.key === 'Enter' && selectedSessionId.value) {
    event.preventDefault()
    openSessionPanel(selectedSessionId.value)
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    openSuggestedCreatePanel()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()

    if (panelMode.value !== 'closed') {
      closePanel()
      return
    }

    selectedSessionId.value = ''
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
  () => [currentMode.value, anchorDate.value.valueOf()],
  () => {
    if (currentMode.value === 'day') {
      closePanel()
    }
  },
)

watch(visibleDayTimeBoxes, (timeBoxes) => {
  if (
    currentMode.value === 'day' &&
    selectedSessionId.value &&
    !timeBoxes.some((timeBox) => timeBox.id === selectedSessionId.value)
  ) {
    selectedSessionId.value = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleDayKeyboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleDayKeyboard)
})
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
          <div v-if="currentMode === 'day'" class="mt-3 flex flex-wrap gap-2">
            <div
              class="rounded-full bg-badge-neutral px-3 py-1 text-xs font-semibold text-badge-neutral-text"
            >
              {{ daySummary.durationLabel }} hrs
            </div>
            <div
              class="rounded-full bg-badge-neutral px-3 py-1 text-xs font-semibold text-badge-neutral-text"
            >
              {{ daySummary.count }} sessions
            </div>
            <div
              class="rounded-full bg-badge-neutral px-3 py-1 text-xs font-semibold text-badge-neutral-text"
            >
              {{ daySummary.projectCount }} projects
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div
            class="inline-flex rounded-xl border border-border bg-surface-strong p-1 shadow-control"
          >
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                currentMode === 'day'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('day')"
            >
              Day
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
        <SessionsDayView
          v-if="currentMode === 'day'"
          :anchor-date="anchorDate"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :tag-name-by-id="tagNameById"
          :time-boxes="visibleDayTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @open-session="openSessionPanel"
        />

        <SessionsWeekView
          v-else-if="currentMode === 'week'"
          :anchor-date="anchorDate"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @create-session="openCreatePanel"
          @open-day="handleOpenDay"
          @open-session="openSessionPanel"
        />

        <SessionsMonthView
          v-else
          :anchor-date="anchorDate"
          :project-name-by-id="projectNameById"
          :selected-session-id="selectedSessionId"
          :time-boxes="visibleCalendarTimeBoxes"
          @change-session="persistSessionChange"
          @open-day="handleOpenDay"
          @open-session="openSessionPanel"
        />
      </div>

      <SessionsSidePanel
        v-if="panelMode !== 'closed'"
        :day="panelDate ?? undefined"
        :initial-end-time="createInitialEndTime"
        :initial-start-time="createInitialStartTime"
        :mode="panelMode"
        :session-id="panelSessionId"
        @close="closePanel"
        @created="handlePanelCreated"
      />
    </div>
  </div>
</template>
