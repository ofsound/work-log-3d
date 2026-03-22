import { addDays, formatDateKey, parseDateKey } from './calendar'
import { getTimeBoxDurationMinutes } from './timeboxes'

import type { EntityId, TimeBox } from './types'

export const SESSION_TAG_MATCH_MODES = ['any', 'all'] as const
export const SESSION_NOTES_STATES = ['any', 'with', 'empty'] as const
export const SESSION_LIST_SORTS = ['newest', 'oldest', 'longest', 'shortest'] as const

export type SessionTagMatchMode = (typeof SESSION_TAG_MATCH_MODES)[number]
export type SessionNotesState = (typeof SESSION_NOTES_STATES)[number]
export type SessionListSort = (typeof SESSION_LIST_SORTS)[number]

export interface SessionListFilters {
  query: string
  projectIds: EntityId[]
  tagIds: EntityId[]
  tagMode: SessionTagMatchMode
  dateStart: string
  dateEnd: string
  minMinutes: number | null
  maxMinutes: number | null
  untaggedOnly: boolean
  notesState: SessionNotesState
  sort: SessionListSort
}

export interface SessionListItem {
  timeBox: TimeBox
  projectName: string
  tagNames: string[]
  searchText: string
  durationMinutes: number
}

const searchWhitespacePattern = /\s+/g

const compareDates = (left: Date | null, right: Date | null) => {
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1

  return left.valueOf() - right.valueOf()
}

const normalizeOptionalNumber = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  const normalized = Math.trunc(value)

  return normalized >= 0 ? normalized : null
}

const normalizeOptionalDateKey = (value: string | undefined) => {
  const normalized = value?.trim() ?? ''
  const parsed = parseDateKey(normalized)

  return parsed ? formatDateKey(parsed) : ''
}

const normalizeEntityIds = (values: EntityId[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  )

export const normalizeSessionListSearchText = (value: string) =>
  value.trim().toLowerCase().replace(searchWhitespacePattern, ' ')

export const getSessionListQueryTokens = (value: string) =>
  normalizeSessionListSearchText(value).split(' ').filter(Boolean)

export const createDefaultSessionListFilters = (): SessionListFilters => ({
  query: '',
  projectIds: [],
  tagIds: [],
  tagMode: 'any',
  dateStart: '',
  dateEnd: '',
  minMinutes: null,
  maxMinutes: null,
  untaggedOnly: false,
  notesState: 'any',
  sort: 'newest',
})

export const normalizeSessionListFilters = (
  input: Partial<SessionListFilters> = {},
): SessionListFilters => {
  const defaults = createDefaultSessionListFilters()
  const dateStart = normalizeOptionalDateKey(input.dateStart)
  const dateEnd = normalizeOptionalDateKey(input.dateEnd)
  const parsedStart = parseDateKey(dateStart)
  const parsedEnd = parseDateKey(dateEnd)
  const normalizedProjectIds = normalizeEntityIds(input.projectIds ?? defaults.projectIds)
  const normalizedTagIds = normalizeEntityIds(input.tagIds ?? defaults.tagIds)
  const normalizedTagMode = SESSION_TAG_MATCH_MODES.includes(input.tagMode as SessionTagMatchMode)
    ? (input.tagMode as SessionTagMatchMode)
    : defaults.tagMode
  const normalizedNotesState = SESSION_NOTES_STATES.includes(input.notesState as SessionNotesState)
    ? (input.notesState as SessionNotesState)
    : defaults.notesState
  const normalizedSort = SESSION_LIST_SORTS.includes(input.sort as SessionListSort)
    ? (input.sort as SessionListSort)
    : defaults.sort
  let minMinutes = normalizeOptionalNumber(input.minMinutes)
  let maxMinutes = normalizeOptionalNumber(input.maxMinutes)

  if (minMinutes !== null && maxMinutes !== null && minMinutes > maxMinutes) {
    ;[minMinutes, maxMinutes] = [maxMinutes, minMinutes]
  }

  return {
    query: normalizeSessionListSearchText(input.query ?? defaults.query),
    projectIds: normalizedProjectIds,
    tagIds: input.untaggedOnly ? [] : normalizedTagIds,
    tagMode: normalizedTagMode,
    dateStart:
      parsedStart && parsedEnd && parsedStart.valueOf() > parsedEnd.valueOf() ? dateEnd : dateStart,
    dateEnd:
      parsedStart && parsedEnd && parsedStart.valueOf() > parsedEnd.valueOf() ? dateStart : dateEnd,
    minMinutes,
    maxMinutes,
    untaggedOnly: Boolean(input.untaggedOnly),
    notesState: normalizedNotesState,
    sort: normalizedSort,
  }
}

export const hasSessionListFilters = (filters: SessionListFilters) => {
  const defaults = createDefaultSessionListFilters()

  return (
    filters.query !== defaults.query ||
    filters.projectIds.length > 0 ||
    filters.tagIds.length > 0 ||
    filters.tagMode !== defaults.tagMode ||
    filters.dateStart !== defaults.dateStart ||
    filters.dateEnd !== defaults.dateEnd ||
    filters.minMinutes !== defaults.minMinutes ||
    filters.maxMinutes !== defaults.maxMinutes ||
    filters.untaggedOnly !== defaults.untaggedOnly ||
    filters.notesState !== defaults.notesState
  )
}

export const createSessionListItem = ({
  timeBox,
  projectName,
  tagNames,
}: {
  timeBox: TimeBox
  projectName: string
  tagNames: string[]
}): SessionListItem => ({
  timeBox,
  projectName,
  tagNames,
  searchText: normalizeSessionListSearchText(
    [timeBox.notes ?? '', projectName, ...tagNames].filter(Boolean).join(' '),
  ),
  durationMinutes: getTimeBoxDurationMinutes(timeBox),
})

const matchesSessionListQuery = (item: SessionListItem, filters: SessionListFilters) => {
  const queryTokens = getSessionListQueryTokens(filters.query)

  if (queryTokens.length === 0) {
    return true
  }

  return queryTokens.every((token) => item.searchText.includes(token))
}

const matchesSessionListProjectFilter = (item: SessionListItem, filters: SessionListFilters) => {
  if (filters.projectIds.length === 0) {
    return true
  }

  return filters.projectIds.includes(item.timeBox.project)
}

const matchesSessionListTagFilter = (item: SessionListItem, filters: SessionListFilters) => {
  if (filters.untaggedOnly) {
    return item.timeBox.tags.length === 0
  }

  if (filters.tagIds.length === 0) {
    return true
  }

  if (filters.tagMode === 'all') {
    return filters.tagIds.every((tagId) => item.timeBox.tags.includes(tagId))
  }

  return filters.tagIds.some((tagId) => item.timeBox.tags.includes(tagId))
}

const matchesSessionListDateFilter = (item: SessionListItem, filters: SessionListFilters) => {
  if (!filters.dateStart && !filters.dateEnd) {
    return true
  }

  if (!item.timeBox.startTime || !item.timeBox.endTime) {
    return false
  }

  const rangeStart = filters.dateStart ? parseDateKey(filters.dateStart) : null
  const rangeEnd = filters.dateEnd ? parseDateKey(filters.dateEnd) : null
  const rangeEndExclusive = rangeEnd ? addDays(rangeEnd, 1) : null

  return (
    (!rangeStart || item.timeBox.endTime.valueOf() > rangeStart.valueOf()) &&
    (!rangeEndExclusive || item.timeBox.startTime.valueOf() < rangeEndExclusive.valueOf())
  )
}

const matchesSessionListDurationFilter = (item: SessionListItem, filters: SessionListFilters) => {
  if (filters.minMinutes !== null && item.durationMinutes < filters.minMinutes) {
    return false
  }

  if (filters.maxMinutes !== null && item.durationMinutes > filters.maxMinutes) {
    return false
  }

  return true
}

const matchesSessionListNotesState = (item: SessionListItem, filters: SessionListFilters) => {
  const hasNotes = item.timeBox.notes.trim().length > 0

  if (filters.notesState === 'with') {
    return hasNotes
  }

  if (filters.notesState === 'empty') {
    return !hasNotes
  }

  return true
}

export const matchesSessionListFilters = (item: SessionListItem, filters: SessionListFilters) =>
  matchesSessionListQuery(item, filters) &&
  matchesSessionListProjectFilter(item, filters) &&
  matchesSessionListTagFilter(item, filters) &&
  matchesSessionListDateFilter(item, filters) &&
  matchesSessionListDurationFilter(item, filters) &&
  matchesSessionListNotesState(item, filters)

const compareNewest = (left: SessionListItem, right: SessionListItem) =>
  compareDates(right.timeBox.startTime, left.timeBox.startTime) ||
  compareDates(right.timeBox.endTime, left.timeBox.endTime) ||
  left.timeBox.id.localeCompare(right.timeBox.id)

export const sortSessionListItems = (items: SessionListItem[], sort: SessionListSort) => {
  return items.slice().sort((left, right) => {
    if (sort === 'oldest') {
      return (
        compareDates(left.timeBox.startTime, right.timeBox.startTime) || compareNewest(left, right)
      )
    }

    if (sort === 'longest') {
      return right.durationMinutes - left.durationMinutes || compareNewest(left, right)
    }

    if (sort === 'shortest') {
      return left.durationMinutes - right.durationMinutes || compareNewest(left, right)
    }

    return compareNewest(left, right)
  })
}

export const applySessionListFilters = (items: SessionListItem[], filters: SessionListFilters) =>
  sortSessionListItems(
    items.filter((item) => matchesSessionListFilters(item, filters)),
    filters.sort,
  )
