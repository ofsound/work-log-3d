<script setup lang="ts">
import { Timestamp, orderBy, query, where } from 'firebase/firestore'
import { useCollection } from 'vuefire'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { definePageMeta } from '#imports'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useMediaQuery } from '~/composables/useMediaQuery'
import { useUserSettings } from '~/composables/useUserSettings'
import { useWorklogRepository } from '~/composables/useWorklogRepository'
import { toProjects, toTags, toTimeBoxes } from '~/utils/worklog-firebase'
import {
  buildSessionsRouteQuery,
  parseSessionsRouteState,
  type SessionsViewMode,
} from '~/utils/sessions-route-state'
import type { SessionListFilters, TimeBoxInput } from '~~/shared/worklog'
import {
  addDays,
  addMinutes,
  addMonths,
  applySessionListFilters,
  buildYearHeatmapMonths,
  createDefaultSessionListFilters,
  createSessionListItem,
  formatDateKey,
  formatToDatetimeLocal,
  getBufferedCalendarRange,
  getDayRange,
  getEndOfWeek,
  getMonthGridRange,
  getSessionListQueryTokens,
  getStartOfWeek,
  getTimeBoxDurationMinutes,
  getTimeBoxesForDay,
  getTotalDurationLabel,
  getWorklogErrorMessage,
  isSameDay,
  normalizeSessionListFilters,
  setTimeOnDate,
  sortNamedEntities,
} from '~~/shared/worklog'

definePageMeta({ layout: 'main-workspace' })

interface SessionChangePayload {
  id: string
  input: TimeBoxInput
  duplicate: boolean
}

interface SessionCreatePayload {
  startTime: Date
  endTime: Date
}

interface SessionCreatePreview {
  range: SessionCreatePayload
  createdSessionId: string | null
}

type DaySidebarTab = 'scratchpad' | 'overview'
type PanelMode = 'closed' | DaySidebarTab | 'session' | 'create'

const route = useRoute()
const router = useRouter()
const { hideTags } = useUserSettings()

const repositories = useWorklogRepository()
const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

const allTimeBoxes = useCollection(timeBoxesCollection)
const allProjects = useCollection(projectsCollection)
const allTags = useCollection(tagsCollection)

const panelMode = ref<PanelMode>('closed')
const panelSessionId = ref('')
const selectedSessionId = ref('')
const daySidebarTab = ref<DaySidebarTab>('scratchpad')
const createRange = ref<SessionCreatePayload | null>(null)
const createPreview = ref<SessionCreatePreview | null>(null)
const mutationErrorMessage = ref('')
const sessionsHeaderRef = ref<HTMLElement | null>(null)
const sessionsSidePanelRef = ref<{ flushScratchpad: () => Promise<void> } | null>(null)
const hasMounted = ref(false)
const isDesktop = useMediaQuery('(min-width: 1024px)', false)

const routeState = computed(() =>
  parseSessionsRouteState(route.query as Record<string, string | string[] | undefined>),
)
const currentMode = computed(() => routeState.value.mode)
const anchorDate = computed(() => routeState.value.date)
const listFilters = computed(() => routeState.value.listFilters)
const scratchpadDateKey = computed(() => formatDateKey(anchorDate.value))
const isPersistentScratchpad = computed(
  () => currentMode.value === 'day' && hasMounted.value && isDesktop.value,
)
const shouldOverlaySidePanel = computed(
  () =>
    isDesktop.value &&
    (currentMode.value === 'week' || currentMode.value === 'month') &&
    panelMode.value !== 'closed',
)

const resolvedTimeBoxes = computed(() =>
  toTimeBoxes(allTimeBoxes.value as FirebaseTimeBoxDocument[]),
)

const yearHeatmapMonths = computed(() =>
  buildYearHeatmapMonths(resolvedTimeBoxes.value, new Date()),
)

const calendarMode = computed(() =>
  currentMode.value === 'month' ? 'month' : currentMode.value === 'week' ? 'week' : 'day',
)

const calendarQuery = computed(() => {
  if (!timeBoxesCollection.value) {
    return null
  }

  const bufferedRange = getBufferedCalendarRange(calendarMode.value, anchorDate.value)

  return query(
    timeBoxesCollection.value,
    where('startTime', '<', Timestamp.fromDate(bufferedRange.end)),
    where('endTime', '>', Timestamp.fromDate(bufferedRange.start)),
    orderBy('startTime', 'asc'),
    orderBy('endTime', 'asc'),
  )
})

const calendarTimeBoxes = useCollection(calendarQuery, {
  ssrKey: 'sessions-calendar-time-boxes',
})

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
const projectById = computed(() =>
  Object.fromEntries(sortedProjects.value.map((project) => [project.id, project])),
)
const tagNameById = computed(() =>
  Object.fromEntries(sortedTags.value.map((tag) => [tag.id, tag.name])),
)
const listSearchTokens = computed(() => getSessionListQueryTokens(listFilters.value.query))
const sessionListItems = computed(() =>
  resolvedTimeBoxes.value.map((timeBox) =>
    createSessionListItem({
      timeBox,
      projectName: projectNameById.value[timeBox.project] ?? '',
      tagNames: timeBox.tags.map((tagId) => tagNameById.value[tagId] ?? '').filter(Boolean),
    }),
  ),
)
const filteredSessionListItems = computed(() =>
  applySessionListFilters(sessionListItems.value, listFilters.value),
)
const filteredSessionListTimeBoxes = computed(() =>
  filteredSessionListItems.value.map((item) => item.timeBox),
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
const createPreviewRange = computed(() => createPreview.value?.range ?? null)

const calendarHeaderSummary = computed(() => {
  const mode = currentMode.value
  const boxes =
    mode === 'day'
      ? visibleDayTimeBoxes.value
      : mode === 'week' || mode === 'month'
        ? visibleCalendarTimeBoxes.value
        : null
  if (!boxes) {
    return null
  }

  return {
    count: boxes.length,
    durationLabel: getTotalDurationLabel(boxes),
    projectCount: new Set(boxes.map((timeBox) => timeBox.project)).size,
  }
})
const listSummary = computed(() => ({
  count: filteredSessionListTimeBoxes.value.length,
  durationLabel: getTotalDurationLabel(filteredSessionListTimeBoxes.value),
}))

const weekTitle = computed(() => {
  const start = getStartOfWeek(anchorDate.value)
  const end = addDays(getEndOfWeek(anchorDate.value), -1)

  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).formatRange(start, end)
})

const yearTitle = computed(() => {
  const latestYear = yearHeatmapMonths.value[0]?.year
  const earliestYear = yearHeatmapMonths.value.at(-1)?.year

  if (!latestYear || !earliestYear || latestYear === earliestYear) {
    return String(latestYear ?? new Date().getFullYear())
  }

  return `${earliestYear}-${latestYear}`
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

  if (currentMode.value === 'year') {
    return yearTitle.value
  }

  return 'Sessions'
})

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
  nextState: Partial<ReturnType<typeof parseSessionsRouteState>>,
  options: {
    history?: 'push' | 'replace'
  } = {},
) => {
  mutationErrorMessage.value = ''

  const nextQuery = buildSessionsRouteQuery(
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

const resetPanelState = (
  mode: PanelMode,
  options: {
    preserveCreatePreview?: boolean
    rememberDayTab?: boolean
  } = {},
) => {
  panelMode.value = mode
  panelSessionId.value = ''
  createRange.value = null

  if ((mode === 'scratchpad' || mode === 'overview') && options.rememberDayTab !== false) {
    daySidebarTab.value = mode
  }

  if (!options.preserveCreatePreview) {
    createPreview.value = null
  }
}

const flushScratchpadIfNeeded = async () => {
  if (!isPersistentScratchpad.value) {
    return
  }

  await sessionsSidePanelRef.value?.flushScratchpad()
}

const closePanel = async () => {
  await flushScratchpadIfNeeded()
  selectedSessionId.value = ''
  resetPanelState(isPersistentScratchpad.value ? daySidebarTab.value : 'closed', {
    rememberDayTab: false,
  })
}

const selectSession = (sessionId: string) => {
  selectedSessionId.value = sessionId
}

const openSessionPanel = async (
  sessionId: string,
  options: {
    preserveCreatePreview?: boolean
    /** When set (e.g. month grid), sync `date` in the URL to this day before showing the session. */
    day?: Date
  } = {},
) => {
  await flushScratchpadIfNeeded()
  if (!options.preserveCreatePreview) {
    createPreview.value = null
  }

  selectSession(sessionId)
  panelMode.value = 'session'
  panelSessionId.value = sessionId
  createRange.value = null

  if (options.day) {
    await updateRouteState({ date: options.day }, { history: 'push' })
  }
}

const openCreatePanel = async (range: SessionCreatePayload) => {
  await flushScratchpadIfNeeded()
  panelMode.value = 'create'
  panelSessionId.value = ''
  selectedSessionId.value = ''
  createRange.value = range
  createPreview.value = {
    range,
    createdSessionId: null,
  }
}

const markCreatePreviewSaved = (sessionId: string) => {
  if (!createPreview.value) {
    return
  }

  if (resolvedTimeBoxes.value.some((timeBox) => timeBox.id === sessionId)) {
    createPreview.value = null
    return
  }

  createPreview.value = {
    ...createPreview.value,
    createdSessionId: sessionId,
  }
}

const roundToSnapMinutes = (date: Date) => {
  const next = new Date(date.valueOf())
  next.setSeconds(0, 0)
  next.setMinutes(Math.round(next.getMinutes() / 10) * 10)
  return next
}

const getSelectedDayTimeBox = () =>
  visibleDayTimeBoxes.value.find((timeBox) => timeBox.id === selectedSessionId.value) ?? null

const openScratchpadPanel = async () => {
  if (!isPersistentScratchpad.value) {
    return
  }

  await flushScratchpadIfNeeded()
  selectedSessionId.value = ''
  resetPanelState('scratchpad')
}

const openOverviewPanel = async () => {
  if (!isPersistentScratchpad.value) {
    return
  }

  await flushScratchpadIfNeeded()
  selectedSessionId.value = ''
  resetPanelState('overview')
}

const openSuggestedCreatePanel = async () => {
  const selectedTimeBox = getSelectedDayTimeBox()
  const defaultStart = isSameDay(anchorDate.value, new Date())
    ? roundToSnapMinutes(new Date())
    : setTimeOnDate(anchorDate.value, 9, 0)

  const startTime = selectedTimeBox?.startTime
    ? new Date(selectedTimeBox.startTime.valueOf())
    : defaultStart
  const durationMinutes = selectedTimeBox ? getTimeBoxDurationMinutes(selectedTimeBox) || 60 : 60

  await openCreatePanel({
    startTime,
    endTime: addMinutes(startTime, durationMinutes),
  })
}

const updateListFilters = async (nextFilters: Partial<SessionListFilters>) => {
  await updateRouteState({
    listFilters: normalizeSessionListFilters({
      ...listFilters.value,
      ...nextFilters,
    }),
  })
}

const clearListFilters = async () => {
  await updateRouteState({
    listFilters: normalizeSessionListFilters({
      ...createDefaultSessionListFilters(),
      sort: listFilters.value.sort,
    }),
  })
}

const handleModeChange = async (mode: SessionsViewMode) => {
  if (mode === currentMode.value) {
    return
  }

  await flushScratchpadIfNeeded()
  resetPanelState('closed')

  if (mode === 'search') {
    await updateRouteState(
      {
        mode,
        listFilters: createDefaultSessionListFilters(),
      },
      { history: 'push' },
    )
    return
  }

  await updateRouteState({ mode }, { history: 'push' })
}

const handleOpenDay = async (day: Date) => {
  await flushScratchpadIfNeeded()

  if (currentMode.value === 'month') {
    const dayBoxes = getTimeBoxesForDay(visibleCalendarTimeBoxes.value, day)
    if (dayBoxes.length === 0) {
      await closePanel()
      await updateRouteState({ date: day }, { history: 'push' })
      return
    }

    selectedSessionId.value = ''
    resetPanelState('overview')
    await updateRouteState({ date: day }, { history: 'push' })
    return
  }

  resetPanelState('closed')
  await updateRouteState({ mode: 'day', date: day }, { history: 'push' })
}

const handleOpenSessionFromMonth = async (payload: { day: Date; sessionId: string }) => {
  await openSessionPanel(payload.sessionId, { day: payload.day })
}

const handleNavigate = async (direction: -1 | 1) => {
  await flushScratchpadIfNeeded()

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
  await flushScratchpadIfNeeded()
  await updateRouteState({ date: new Date() })
}

const persistSessionChange = async ({ id, input, duplicate }: SessionChangePayload) => {
  try {
    mutationErrorMessage.value = ''

    if (duplicate) {
      const createdId = await repositories.timeBoxes.create(input)
      await openSessionPanel(createdId)
      return
    }

    await repositories.timeBoxes.update(id, input)
    await openSessionPanel(id)
  } catch (error) {
    mutationErrorMessage.value = getWorklogErrorMessage(error, 'Unable to update the session.')
  }
}

const handlePanelCreated = async (sessionId: string) => {
  markCreatePreviewSaved(sessionId)
  await openSessionPanel(sessionId, { preserveCreatePreview: true })
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

/** Same dismiss behavior as Escape for calendar views (selection, overlay panel, day scratchpad). */
const applyCalendarEscapeDismiss = () => {
  if (isPersistentScratchpad.value) {
    if (panelMode.value !== 'scratchpad' || selectedSessionId.value) {
      if (daySidebarTab.value === 'overview') {
        void openOverviewPanel()
        return
      }

      void openScratchpadPanel()
    }
    return
  }

  if (panelMode.value !== 'closed') {
    void closePanel()
    return
  }

  selectedSessionId.value = ''
}

const handleCalendarKeyboard = (event: KeyboardEvent) => {
  if (
    ['search', 'year'].includes(currentMode.value) ||
    isEditableTarget(event) ||
    event.metaKey ||
    event.ctrlKey
  ) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    applyCalendarEscapeDismiss()
    return
  }

  if (currentMode.value !== 'day') {
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
    void openSessionPanel(selectedSessionId.value)
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    void openSuggestedCreatePanel()
    return
  }
}

watch(
  () => [currentMode.value, isDesktop.value, hasMounted.value],
  ([mode, desktop, mounted]) => {
    if (!mounted) {
      resetPanelState('closed')
      return
    }

    if (mode === 'day' && desktop) {
      if (panelMode.value === 'closed') {
        panelMode.value = daySidebarTab.value
      }
      return
    }

    if ((mode === 'month' || mode === 'week') && panelMode.value === 'overview') {
      return
    }

    if (panelMode.value === 'scratchpad' || panelMode.value === 'overview') {
      resetPanelState('closed')
    }
  },
  { immediate: true },
)

watch(
  () => [currentMode.value, anchorDate.value.valueOf()],
  () => {
    if (currentMode.value === 'day') {
      selectedSessionId.value = ''
      resetPanelState(isPersistentScratchpad.value ? daySidebarTab.value : 'closed', {
        rememberDayTab: false,
      })
    }
  },
)

watch(currentMode, (mode) => {
  if (mode === 'search' || mode === 'year') {
    resetPanelState('closed')
  }
})

watch(visibleDayTimeBoxes, (timeBoxes) => {
  if (
    currentMode.value === 'day' &&
    selectedSessionId.value &&
    !timeBoxes.some((timeBox) => timeBox.id === selectedSessionId.value)
  ) {
    selectedSessionId.value = ''
  }
})

watch(resolvedTimeBoxes, (timeBoxes) => {
  const preview = createPreview.value

  if (!preview?.createdSessionId) {
    return
  }

  if (timeBoxes.some((timeBox) => timeBox.id === preview.createdSessionId)) {
    createPreview.value = null
  }
})

onMounted(() => {
  hasMounted.value = true
  window.addEventListener('keydown', handleCalendarKeyboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleCalendarKeyboard)
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div ref="sessionsHeaderRef" class="shrink-0 border-b border-border px-6 py-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="text-3xl font-bold tracking-tight">{{ pageTitle }}</div>
          <div v-if="calendarHeaderSummary" class="mt-3 flex flex-wrap gap-2">
            <div
              class="rounded-lg bg-badge-duration px-3 py-1.5 text-sm font-bold tracking-tight text-badge-duration-text tabular-nums"
            >
              {{ calendarHeaderSummary.durationLabel }} hrs
            </div>
            <div
              class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
            >
              {{ calendarHeaderSummary.count }} sessions
            </div>
            <div
              class="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text"
            >
              {{ calendarHeaderSummary.projectCount }} projects
            </div>
          </div>
        </div>

        <div class="flex flex-col items-end gap-2">
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
                currentMode === 'year'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('year')"
            >
              Year
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-semibold transition"
              :class="
                currentMode === 'search'
                  ? 'bg-header text-header-text'
                  : 'text-text-muted hover:bg-surface'
              "
              @click="handleModeChange('search')"
            >
              Search
            </button>
          </div>

          <div
            v-if="currentMode !== 'search' && currentMode !== 'year'"
            class="flex items-center gap-2"
          >
            <button
              type="button"
              class="inline-flex cursor-pointer items-center justify-center rounded-md border border-button-secondary-border bg-button-secondary p-1.5 text-button-secondary-text hover:bg-button-secondary-hover"
              aria-label="Previous period"
              @click="handleNavigate(-1)"
            >
              <svg
                class="h-5 w-5 shrink-0"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-md border border-button-secondary-border bg-button-secondary px-2.5 py-1.5 text-sm font-semibold text-button-secondary-text hover:bg-button-secondary-hover"
              @click="handleGoToday"
            >
              Today
            </button>
            <button
              type="button"
              class="inline-flex cursor-pointer items-center justify-center rounded-md border border-button-secondary-border bg-button-secondary p-1.5 text-button-secondary-text hover:bg-button-secondary-hover"
              aria-label="Next period"
              @click="handleNavigate(1)"
            >
              <svg
                class="h-5 w-5 shrink-0"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p v-if="mutationErrorMessage" class="mt-4 text-sm text-danger">
        {{ mutationErrorMessage }}
      </p>
    </div>

    <SessionsWorkspaceShell :overlay-aside="shouldOverlaySidePanel">
      <div
        v-if="currentMode === 'search'"
        class="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row"
      >
        <aside
          class="flex w-full shrink-0 flex-col overflow-hidden border-b border-border-subtle bg-surface/96 backdrop-blur max-lg:max-h-[min(50vh,26rem)] lg:h-full lg:max-h-none lg:w-[400px] lg:border-r lg:border-b-0"
        >
          <SessionListFilterPanel
            :filters="listFilters"
            :hide-tags="hideTags"
            :projects="sortedProjects"
            :result-count="listSummary.count"
            :tags="sortedTags"
            :total-duration-label="listSummary.durationLabel"
            @clear-filters="clearListFilters"
            @update-filters="updateListFilters"
          />
        </aside>

        <div
          class="mx-auto flex min-h-0 w-full max-w-6xl min-w-0 flex-1 flex-col gap-6 overflow-auto overscroll-contain px-6 py-6 pb-2"
        >
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
        </div>
      </div>

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
          @dismiss-calendar="applyCalendarEscapeDismiss"
          @open-day="handleOpenDay"
          @open-session="openSessionPanel"
        />

        <SessionsYearView
          v-else-if="currentMode === 'year'"
          :selected-date="anchorDate"
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
          :selected-session-id="selectedSessionId"
          :session-id="panelSessionId"
          :time-boxes="visibleDayTimeBoxes"
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
