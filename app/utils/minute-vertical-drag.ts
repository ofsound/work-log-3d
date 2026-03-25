import { formatToDatetimeLocal } from '~~/shared/worklog'

export const MINUTE_DRAG_THRESHOLD_PX = 6

/** Vertical pixels of drag per one minute of change (higher = slower / finer). */
export const MINUTE_DRAG_PIXELS_PER_MINUTE = 6

export const minuteDragDeltaMinutes = (startY: number, clientY: number) =>
  Math.round((startY - clientY) / MINUTE_DRAG_PIXELS_PER_MINUTE)

/**
 * Shifts a datetime-local style value by whole minutes; rolls hours and calendar via `Date`.
 */
export const addMinutesToDatetimeLocal = (isoLike: string, deltaMinutes: number): string => {
  const d = new Date(isoLike)

  if (Number.isNaN(d.getTime())) {
    return isoLike
  }

  d.setMinutes(d.getMinutes() + deltaMinutes)

  return formatToDatetimeLocal(d)
}
