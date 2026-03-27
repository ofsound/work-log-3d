export const slugifyName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export const formatToDatetimeLocal = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/** Locale-aware time for session UIs (matches typical list/overview formatting). */
export const formatLocaleTime = (date: Date) =>
  date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export type SessionTimeHeroLabels = {
  primary: string
  secondary?: string
}

/**
 * Large hero line is always start–end times; when the range crosses calendar days,
 * a secondary line carries unambiguous dates.
 */
export function formatSessionTimeHero(start: Date, end: Date): SessionTimeHeroLabels | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }

  const startTime = formatLocaleTime(start)
  const endTime = formatLocaleTime(end)
  const primary = `${startTime} – ${endTime}`

  if (isSameCalendarDay(start, end)) {
    return { primary }
  }

  const sameYear = start.getFullYear() === end.getFullYear()
  const dateOpts: Intl.DateTimeFormatOptions = sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }

  return {
    primary,
    secondary: `${start.toLocaleDateString(undefined, dateOpts)} → ${end.toLocaleDateString(undefined, dateOpts)}`,
  }
}

export const formatSecondsToMinutesSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const formatSecondsToMinutesSecondsParts = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return {
    formattedMinutes: String(minutes).padStart(2, '0'),
    formattedSeconds: String(seconds).padStart(2, '0'),
  }
}

export const DURATION_DISPLAY_FORMATS = ['hours-decimal', 'hours-rounded', 'minutes'] as const

export type DurationDisplayFormat = (typeof DURATION_DISPLAY_FORMATS)[number]

export const formatMinutesToHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = ((totalMinutes % 60) / 60).toString().slice(1).substring(0, 3)

  return { hours, minutes }
}

export const formatDurationValue = (
  totalMinutes: number,
  format: DurationDisplayFormat = 'hours-decimal',
) => {
  if (format === 'minutes') {
    return `${totalMinutes}m`
  }

  if (format === 'hours-rounded') {
    return String(Math.round(totalMinutes / 60))
  }

  if (totalMinutes === 0) {
    return '0'
  }

  const { hours, minutes } = formatMinutesToHoursAndMinutes(totalMinutes)

  return hours > 0 ? `${hours}${minutes}` : minutes
}

export const formatDurationLabel = (
  totalMinutes: number,
  format: DurationDisplayFormat = 'hours-decimal',
) => {
  const value = formatDurationValue(totalMinutes, format)

  return format === 'minutes' ? value : `${value} hrs`
}

export const formatDurationMinutesLabel = (totalMinutes: number) => {
  return formatDurationValue(totalMinutes, 'hours-decimal')
}

export const formatMinutesAsDecimalHours = (totalMinutes: number) => {
  const hours = totalMinutes / 60

  if (Number.isInteger(hours)) {
    return hours.toFixed(0)
  }

  return hours.toFixed(1)
}
