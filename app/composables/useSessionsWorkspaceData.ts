import type { ComputedRef } from 'vue'

import { computed } from 'vue'

import { Timestamp, orderBy, query, where } from 'firebase/firestore'
import { useCollection } from 'vuefire'

import type {
  FirebaseProjectDocument,
  FirebaseTagDocument,
  FirebaseTimeBoxDocument,
} from '~/utils/worklog-firebase'
import { useFirestoreCollections } from '~/composables/useFirestoreCollections'
import { useUserSettings } from '~/composables/useUserSettings'
import { toProjects, toTags, toTimeBoxes } from '~/utils/worklog-firebase'
import type { SessionsViewMode } from '~/utils/sessions-route-state'
import type { SessionListFilters } from '~~/shared/worklog'
import {
  applySessionListFilters,
  buildYearHeatmapMonths,
  createSessionListItem,
  getBufferedCalendarRange,
  getDayRange,
  getEndOfWeek,
  getMonthGridRange,
  getSessionListQueryTokens,
  getStartOfWeek,
  getTimeBoxesForDay,
  getTotalDurationLabel,
  sortNamedEntities,
} from '~~/shared/worklog'

export interface UseSessionsWorkspaceDataOptions {
  anchorDate: ComputedRef<Date>
  currentMode: ComputedRef<SessionsViewMode>
  listFilters: ComputedRef<SessionListFilters>
}

export function useSessionsWorkspaceData(options: UseSessionsWorkspaceDataOptions) {
  const { hideTags } = useUserSettings()
  const { timeBoxesCollection, projectsCollection, tagsCollection } = useFirestoreCollections()

  const allTimeBoxes = useCollection(timeBoxesCollection)
  const allProjects = useCollection(projectsCollection)
  const allTags = useCollection(tagsCollection)

  const resolvedTimeBoxes = computed(() =>
    toTimeBoxes(allTimeBoxes.value as FirebaseTimeBoxDocument[]),
  )

  const yearHeatmapMonths = computed(() =>
    buildYearHeatmapMonths(resolvedTimeBoxes.value, new Date()),
  )

  const calendarMode = computed(() =>
    options.currentMode.value === 'month'
      ? 'month'
      : options.currentMode.value === 'week'
        ? 'week'
        : 'day',
  )

  const calendarQuery = computed(() => {
    if (!timeBoxesCollection.value) {
      return null
    }

    const bufferedRange = getBufferedCalendarRange(calendarMode.value, options.anchorDate.value)

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
    if (options.currentMode.value === 'week') {
      return {
        start: getStartOfWeek(options.anchorDate.value),
        end: getEndOfWeek(options.anchorDate.value),
      }
    }

    if (options.currentMode.value === 'month') {
      return getMonthGridRange(options.anchorDate.value)
    }

    return getDayRange(options.anchorDate.value)
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
  const sortedTags = computed(() =>
    sortNamedEntities(toTags(allTags.value as FirebaseTagDocument[])),
  )

  const projectNameById = computed(() =>
    Object.fromEntries(sortedProjects.value.map((project) => [project.id, project.name])),
  )
  const projectById = computed(() =>
    Object.fromEntries(sortedProjects.value.map((project) => [project.id, project])),
  )
  const tagNameById = computed(() =>
    Object.fromEntries(sortedTags.value.map((tag) => [tag.id, tag.name])),
  )

  const listSearchTokens = computed(() =>
    getSessionListQueryTokens(options.listFilters.value.query),
  )
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
    applySessionListFilters(sessionListItems.value, options.listFilters.value),
  )
  const filteredSessionListTimeBoxes = computed(() =>
    filteredSessionListItems.value.map((item) => item.timeBox),
  )
  const visibleDayTimeBoxes = computed(() =>
    getTimeBoxesForDay(visibleCalendarTimeBoxes.value, options.anchorDate.value),
  )

  const calendarHeaderSummary = computed(() => {
    const mode = options.currentMode.value
    const boxes =
      mode === 'day'
        ? visibleDayTimeBoxes.value
        : mode === 'week' || mode === 'month'
          ? visibleCalendarTimeBoxes.value
          : mode === 'year'
            ? resolvedTimeBoxes.value
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

  const listSummary = computed(() => {
    const boxes = filteredSessionListTimeBoxes.value

    return {
      count: boxes.length,
      durationLabel: getTotalDurationLabel(boxes),
      projectCount: new Set(boxes.map((timeBox) => timeBox.project)).size,
    }
  })

  return {
    calendarHeaderSummary,
    filteredSessionListItems,
    filteredSessionListTimeBoxes,
    hideTags,
    listSearchTokens,
    listSummary,
    projectById,
    projectNameById,
    resolvedTimeBoxes,
    sortedProjects,
    sortedTags,
    tagNameById,
    visibleCalendarTimeBoxes,
    visibleDayTimeBoxes,
    yearHeatmapMonths,
  }
}
