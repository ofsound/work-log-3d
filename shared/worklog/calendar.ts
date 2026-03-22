import type { TimeBox, TimeBoxInput } from './types'

export const CALENDAR_WEEK_STARTS_ON = 1
export const MINUTES_PER_DAY = 24 * 60
export const MINUTES_PER_HOUR = 60
export const WEEK_DAY_COUNT = 7
export const MONTH_GRID_DAY_COUNT = 42

export interface CalendarRange {
  start: Date
  end: Date
}

export interface TimeBoxDaySegment {
  timeBox: TimeBox
  timeBoxId: string
  dayStart: Date
  segmentStart: Date
  segmentEnd: Date
  startsOnThisDay: boolean
  endsOnThisDay: boolean
}

export interface TimeBoxDaySegmentLayout extends TimeBoxDaySegment {
  lane: number
  laneCount: number
}

export type YearHeatmapIntensity = 0 | 1 | 2 | 3 | 4 | 5

export interface YearHeatmapCell {
  date: Date
  dateKey: string
  minutes: number
  hours: number
  sessionCount: number
  intensity: YearHeatmapIntensity
  inactive: boolean
  isToday: boolean
}

export interface YearHeatmapMonth {
  year: number
  monthIndex: number
  label: string
  weeks: Array<Array<YearHeatmapCell | null>>
}

export const YEAR_HEATMAP_INTENSITY_THRESHOLDS = [120, 240, 360, 480] as const

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const compareMonthStart = (left: Date, right: Date) =>
  left.getFullYear() - right.getFullYear() || left.getMonth() - right.getMonth()

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/

const clampDate = (value: number) => Math.trunc(value)

export const cloneDate = (date: Date) => new Date(date.valueOf())

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const parseDateKey = (value: string | undefined) => {
  if (!value || !dateKeyPattern.test(value)) {
    return null
  }

  const [year = NaN, month = NaN, day = NaN] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

export const isDateWithinRange = (date: Date, range: CalendarRange) =>
  date.valueOf() >= range.start.valueOf() && date.valueOf() < range.end.valueOf()

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.valueOf() + clampDate(minutes) * 60_000)

export const addDays = (date: Date, days: number) => {
  const next = cloneDate(date)
  next.setDate(next.getDate() + clampDate(days))
  return next
}

export const addMonths = (date: Date, months: number) => {
  const next = cloneDate(date)
  next.setMonth(next.getMonth() + clampDate(months))
  return next
}

export const getStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const getEndOfDay = (date: Date) => addDays(getStartOfDay(date), 1)

export const setTimeOnDate = (date: Date, hours: number, minutes: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)

export const getMinutesSinceStartOfDay = (date: Date) =>
  date.getHours() * MINUTES_PER_HOUR + date.getMinutes()

export const getStartOfWeek = (date: Date, weekStartsOn = CALENDAR_WEEK_STARTS_ON) => {
  const start = getStartOfDay(date)
  const day = start.getDay()
  const delta = (day - weekStartsOn + WEEK_DAY_COUNT) % WEEK_DAY_COUNT

  return addDays(start, -delta)
}

export const getEndOfWeek = (date: Date, weekStartsOn = CALENDAR_WEEK_STARTS_ON) =>
  addDays(getStartOfWeek(date, weekStartsOn), WEEK_DAY_COUNT)

export const buildWeekDays = (anchorDate: Date, weekStartsOn = CALENDAR_WEEK_STARTS_ON) => {
  const start = getStartOfWeek(anchorDate, weekStartsOn)

  return Array.from({ length: WEEK_DAY_COUNT }, (_, index) => addDays(start, index))
}

export const getDayRange = (anchorDate: Date): CalendarRange => ({
  start: getStartOfDay(anchorDate),
  end: getEndOfDay(anchorDate),
})

export const getMonthRange = (anchorDate: Date): CalendarRange => {
  const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)

  return { start, end }
}

export const getMonthGridRange = (
  anchorDate: Date,
  weekStartsOn = CALENDAR_WEEK_STARTS_ON,
): CalendarRange => {
  const monthRange = getMonthRange(anchorDate)
  const start = getStartOfWeek(monthRange.start, weekStartsOn)

  return {
    start,
    end: addDays(start, MONTH_GRID_DAY_COUNT),
  }
}

export const buildMonthGridDays = (anchorDate: Date, weekStartsOn = CALENDAR_WEEK_STARTS_ON) => {
  const { start } = getMonthGridRange(anchorDate, weekStartsOn)

  return Array.from({ length: MONTH_GRID_DAY_COUNT }, (_, index) => addDays(start, index))
}

export const getIsoWeekNumber = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || WEEK_DAY_COUNT

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const diffDays = Math.floor((utcDate.valueOf() - yearStart.valueOf()) / 86_400_000)

  return Math.ceil((diffDays + 1) / WEEK_DAY_COUNT)
}

export const getBufferedCalendarRange = (
  mode: 'day' | 'week' | 'month',
  anchorDate: Date,
): CalendarRange => {
  if (mode === 'day') {
    const start = addDays(getStartOfDay(anchorDate), -1)
    return { start, end: addDays(start, 3) }
  }

  if (mode === 'week') {
    const start = addDays(getStartOfWeek(anchorDate), -WEEK_DAY_COUNT)
    return { start, end: addDays(start, WEEK_DAY_COUNT * 3) }
  }

  const anchorMonth = getMonthRange(anchorDate)
  const previousMonth = addMonths(anchorMonth.start, -1)
  const nextMonth = addMonths(anchorMonth.start, 1)
  const start = getMonthGridRange(previousMonth).start
  const end = getMonthGridRange(nextMonth).end

  return { start, end }
}

export const splitTimeBoxIntoDaySegments = (timeBox: TimeBox, range: CalendarRange) => {
  if (!timeBox.startTime || !timeBox.endTime) {
    return [] as TimeBoxDaySegment[]
  }

  const overlapStart = new Date(Math.max(timeBox.startTime.valueOf(), range.start.valueOf()))
  const overlapEnd = new Date(Math.min(timeBox.endTime.valueOf(), range.end.valueOf()))

  if (overlapEnd.valueOf() <= overlapStart.valueOf()) {
    return [] as TimeBoxDaySegment[]
  }

  const segments: TimeBoxDaySegment[] = []
  let dayStart = getStartOfDay(overlapStart)

  while (dayStart.valueOf() < overlapEnd.valueOf()) {
    const nextDay = addDays(dayStart, 1)
    const segmentStartValue = Math.max(overlapStart.valueOf(), dayStart.valueOf())
    const segmentEndValue = Math.min(overlapEnd.valueOf(), nextDay.valueOf())

    if (segmentEndValue > segmentStartValue) {
      segments.push({
        timeBox,
        timeBoxId: timeBox.id,
        dayStart,
        segmentStart: new Date(segmentStartValue),
        segmentEnd: new Date(segmentEndValue),
        startsOnThisDay: isSameDay(timeBox.startTime, dayStart),
        endsOnThisDay: isSameDay(addMinutes(timeBox.endTime, -1), dayStart),
      })
    }

    dayStart = nextDay
  }

  return segments
}

export const buildDaySegmentLayouts = (segments: TimeBoxDaySegment[]) => {
  const sorted = segments
    .slice()
    .sort(
      (left, right) =>
        left.segmentStart.valueOf() - right.segmentStart.valueOf() ||
        left.segmentEnd.valueOf() - right.segmentEnd.valueOf(),
    )

  const layoutEntries: Array<TimeBoxDaySegmentLayout & { clusterId: number }> = []
  const clusterLaneCounts = new Map<number, number>()
  const active: Array<{ lane: number; end: number }> = []
  let clusterId = -1

  sorted.forEach((segment) => {
    const segmentStart = segment.segmentStart.valueOf()

    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index]!.end <= segmentStart) {
        active.splice(index, 1)
      }
    }

    if (active.length === 0) {
      clusterId += 1
    }

    const usedLanes = new Set(active.map((item) => item.lane))
    let lane = 0

    while (usedLanes.has(lane)) {
      lane += 1
    }

    active.push({
      lane,
      end: segment.segmentEnd.valueOf(),
    })

    const clusterLaneCount = Math.max(clusterLaneCounts.get(clusterId) ?? 0, active.length)
    clusterLaneCounts.set(clusterId, clusterLaneCount)

    layoutEntries.push({
      ...segment,
      clusterId,
      lane,
      laneCount: 1,
    })
  })

  return layoutEntries.map(({ clusterId: entryClusterId, ...layout }) => ({
    ...layout,
    laneCount: clusterLaneCounts.get(entryClusterId) ?? 1,
  }))
}

export const getYearHeatmapIntensity = (minutes: number): YearHeatmapIntensity => {
  if (minutes <= 0) {
    return 0
  }

  if (minutes < YEAR_HEATMAP_INTENSITY_THRESHOLDS[0]) {
    return 1
  }

  if (minutes < YEAR_HEATMAP_INTENSITY_THRESHOLDS[1]) {
    return 2
  }

  if (minutes < YEAR_HEATMAP_INTENSITY_THRESHOLDS[2]) {
    return 3
  }

  if (minutes < YEAR_HEATMAP_INTENSITY_THRESHOLDS[3]) {
    return 4
  }

  return 5
}

const buildTimeBoxDaySummaryMap = (
  timeBoxes: TimeBox[],
): {
  daySummaryByKey: Map<
    string,
    {
      date: Date
      minutes: number
      sessionCount: number
    }
  >
  firstLoggedDay: Date | null
} => {
  const daySummaryByKey = new Map<
    string,
    {
      date: Date
      minutes: number
      sessionCount: number
    }
  >()
  let firstLoggedDay: Date | null = null

  timeBoxes.forEach((timeBox) => {
    if (!timeBox.startTime || !timeBox.endTime) {
      return
    }

    splitTimeBoxIntoDaySegments(timeBox, {
      start: timeBox.startTime,
      end: timeBox.endTime,
    }).forEach((segment) => {
      const date = getStartOfDay(segment.dayStart)
      const key = formatDateKey(date)
      const current = daySummaryByKey.get(key) ?? {
        date,
        minutes: 0,
        sessionCount: 0,
      }

      current.minutes += (segment.segmentEnd.valueOf() - segment.segmentStart.valueOf()) / 60_000
      current.sessionCount += 1
      daySummaryByKey.set(key, current)

      if (!firstLoggedDay || date.valueOf() < firstLoggedDay.valueOf()) {
        firstLoggedDay = date
      }
    })
  })

  return { daySummaryByKey, firstLoggedDay }
}

const buildYearHeatmapMonth = ({
  year,
  monthIndex,
  daySummaryByKey,
  firstLoggedDay,
  today,
}: {
  year: number
  monthIndex: number
  daySummaryByKey: Map<
    string,
    {
      date: Date
      minutes: number
      sessionCount: number
    }
  >
  firstLoggedDay: Date | null
  today: Date
}): YearHeatmapMonth => {
  const monthStart = new Date(year, monthIndex, 1)
  const monthEnd = new Date(year, monthIndex + 1, 1)
  const gridStart = getStartOfWeek(monthStart)
  const gridEnd = getEndOfWeek(addDays(monthEnd, -1))
  const weeks: Array<Array<YearHeatmapCell | null>> = []

  let cursor = gridStart

  while (cursor.valueOf() < gridEnd.valueOf()) {
    const week: Array<YearHeatmapCell | null> = []

    for (let index = 0; index < WEEK_DAY_COUNT; index += 1) {
      const day = cursor

      if (day.getMonth() !== monthIndex) {
        week.push(null)
      } else {
        const date = getStartOfDay(day)
        const dateKey = formatDateKey(date)
        const summary = daySummaryByKey.get(dateKey)
        const inactive =
          !firstLoggedDay ||
          date.valueOf() < firstLoggedDay.valueOf() ||
          date.valueOf() > today.valueOf()
        const minutes = summary?.minutes ?? 0

        week.push({
          date,
          dateKey,
          minutes,
          hours: minutes / MINUTES_PER_HOUR,
          sessionCount: summary?.sessionCount ?? 0,
          intensity: inactive ? 0 : getYearHeatmapIntensity(minutes),
          inactive,
          isToday: isSameDay(date, today),
        })
      }

      cursor = addDays(cursor, 1)
    }

    weeks.push(week)
  }

  return {
    year,
    monthIndex,
    label: monthStart.toLocaleDateString([], { month: 'long' }),
    weeks,
  }
}

/** Months from current month backward to the first month that contains logged time (newest first). */
export const buildYearHeatmapMonths = (
  timeBoxes: TimeBox[],
  today = new Date(),
): YearHeatmapMonth[] => {
  const normalizedToday = getStartOfDay(today)
  const { daySummaryByKey, firstLoggedDay } = buildTimeBoxDaySummaryMap(timeBoxes)
  const endMonth = getStartOfMonth(normalizedToday)

  const buildOne = (year: number, monthIndex: number) =>
    buildYearHeatmapMonth({
      year,
      monthIndex,
      daySummaryByKey,
      firstLoggedDay,
      today: normalizedToday,
    })

  if (!firstLoggedDay) {
    return [buildOne(endMonth.getFullYear(), endMonth.getMonth())]
  }

  const startMonth = getStartOfMonth(firstLoggedDay)

  if (compareMonthStart(endMonth, startMonth) < 0) {
    return [buildOne(endMonth.getFullYear(), endMonth.getMonth())]
  }

  const months: YearHeatmapMonth[] = []
  let cursor = endMonth

  while (compareMonthStart(cursor, startMonth) >= 0) {
    months.push(buildOne(cursor.getFullYear(), cursor.getMonth()))
    cursor = addMonths(cursor, -1)
  }

  return months
}

export const sortTimeBoxesByStartAscending = (timeBoxes: TimeBox[]) =>
  timeBoxes
    .slice()
    .sort(
      (left, right) =>
        (left.startTime?.valueOf() ?? 0) - (right.startTime?.valueOf() ?? 0) ||
        (left.endTime?.valueOf() ?? 0) - (right.endTime?.valueOf() ?? 0),
    )

export const getTimeBoxesForDay = (timeBoxes: TimeBox[], day: Date) => {
  const dayRange = { start: getStartOfDay(day), end: getEndOfDay(day) }

  return sortTimeBoxesByStartAscending(
    timeBoxes.filter((timeBox) => {
      if (!timeBox.startTime || !timeBox.endTime) {
        return false
      }

      return (
        timeBox.startTime.valueOf() < dayRange.end.valueOf() &&
        timeBox.endTime.valueOf() > dayRange.start.valueOf()
      )
    }),
  )
}

const createShiftedTimeBoxInput = (timeBox: TimeBox, nextStartTime: Date): TimeBoxInput => {
  const durationMinutes = Math.max(
    10,
    Math.round(
      ((timeBox.endTime?.valueOf() ?? nextStartTime.valueOf()) -
        (timeBox.startTime?.valueOf() ?? nextStartTime.valueOf())) /
      60_000,
    ),
  )

  return {
    startTime: nextStartTime,
    endTime: addMinutes(nextStartTime, durationMinutes),
    notes: timeBox.notes,
    project: timeBox.project,
    tags: [...timeBox.tags],
  }
}

export const moveTimeBoxToStart = (timeBox: TimeBox, nextStartTime: Date) =>
  createShiftedTimeBoxInput(timeBox, nextStartTime)

export const moveTimeBoxToDay = (timeBox: TimeBox, targetDay: Date) => {
  const sourceStart = timeBox.startTime ?? targetDay
  const nextStart = setTimeOnDate(targetDay, sourceStart.getHours(), sourceStart.getMinutes())

  return createShiftedTimeBoxInput(timeBox, nextStart)
}

export const duplicateTimeBoxToDay = (timeBox: TimeBox, targetDay: Date) =>
  moveTimeBoxToDay(timeBox, targetDay)

export const resizeTimeBoxStart = (timeBox: TimeBox, nextStartTime: Date): TimeBoxInput => ({
  startTime: nextStartTime,
  endTime: cloneDate(timeBox.endTime ?? addMinutes(nextStartTime, 10)),
  notes: timeBox.notes,
  project: timeBox.project,
  tags: [...timeBox.tags],
})

export const resizeTimeBoxEnd = (timeBox: TimeBox, nextEndTime: Date): TimeBoxInput => ({
  startTime: cloneDate(timeBox.startTime ?? addMinutes(nextEndTime, -10)),
  endTime: nextEndTime,
  notes: timeBox.notes,
  project: timeBox.project,
  tags: [...timeBox.tags],
})
