import type { TimeBox } from '~~/shared/worklog'
import {
  buildMonthGridDays,
  formatDateKey,
  getMonthGridRange,
  splitTimeBoxIntoDaySegments,
} from '~~/shared/worklog'

export interface MonthGridSegmentEntry {
  id: string
  timeBox: TimeBox
  segmentStart: Date
  segmentEnd: Date
}

export const MONTH_GRID_VISIBLE_ROWS = 3

export const getMonthGridWeekdays = (anchorDate: Date) =>
  Array.from({ length: 7 }, (_, index) =>
    buildMonthGridDays(anchorDate)[index]!.toLocaleDateString([], { weekday: 'short' }),
  )

export const buildMonthGridDaySegments = (timeBoxes: TimeBox[], anchorDate: Date) => {
  const gridRange = getMonthGridRange(anchorDate)
  const segmentsByKey = new Map<string, MonthGridSegmentEntry[]>()

  timeBoxes.forEach((timeBox) => {
    splitTimeBoxIntoDaySegments(timeBox, gridRange).forEach((segment) => {
      const key = formatDateKey(segment.dayStart)
      const current = segmentsByKey.get(key) ?? []

      current.push({
        id: `${timeBox.id}-${segment.segmentStart.valueOf()}`,
        timeBox,
        segmentStart: segment.segmentStart,
        segmentEnd: segment.segmentEnd,
      })
      current.sort((left, right) => left.segmentStart.valueOf() - right.segmentStart.valueOf())
      segmentsByKey.set(key, current)
    })
  })

  return {
    gridDays: buildMonthGridDays(anchorDate),
    gridRange,
    segmentsByKey,
  }
}
