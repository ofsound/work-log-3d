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

export const formatMinutesToHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = ((totalMinutes % 60) / 60).toString().slice(1).substring(0, 3)

  return { hours, minutes }
}

export const formatDurationMinutesLabel = (totalMinutes: number) => {
  if (totalMinutes === 0) {
    return '0'
  }

  const { hours, minutes } = formatMinutesToHoursAndMinutes(totalMinutes)

  return hours > 0 ? `${hours}${minutes}` : minutes
}
