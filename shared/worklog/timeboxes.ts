import { formatDurationMinutesLabel } from './formatters'
import type { NamedEntity, Project, SortDirection, TimeBox } from './types'

export const compareNamedEntities = (a: NamedEntity, b: NamedEntity) => {
  return a.name.localeCompare(b.name)
}

export const sortNamedEntities = <T extends NamedEntity>(values: T[]) => {
  return values.slice().sort(compareNamedEntities)
}

const compareDates = (a: Date | null, b: Date | null) => {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1

  return a.valueOf() - b.valueOf()
}

export const sortTimeBoxesByStart = (timeBoxes: TimeBox[], direction: SortDirection) => {
  return timeBoxes.slice().sort((a, b) => {
    const comparison = compareDates(a.startTime, b.startTime)
    return direction === 'desc' ? comparison * -1 : comparison
  })
}

export const getTimeBoxDurationMinutes = (timeBox: TimeBox) => {
  if (!timeBox.startTime || !timeBox.endTime) {
    return 0
  }

  return (timeBox.endTime.valueOf() - timeBox.startTime.valueOf()) / 60000
}

export const getTotalDurationMinutes = (timeBoxes: TimeBox[]) => {
  return timeBoxes.reduce((sum, timeBox) => sum + getTimeBoxDurationMinutes(timeBox), 0)
}

export const getDurationMinutesLabel = (timeBox: TimeBox) => {
  return `${getTimeBoxDurationMinutes(timeBox)}m`
}

export const getTotalDurationLabel = (timeBoxes: TimeBox[]) => {
  return formatDurationMinutesLabel(getTotalDurationMinutes(timeBoxes))
}

export const groupTimeBoxesByStartDay = (timeBoxes: TimeBox[]) => {
  const groups: TimeBox[][] = []
  let previousDate = ''

  timeBoxes.forEach((timeBox) => {
    const currentDate = timeBox.startTime?.toDateString() ?? ''

    if (currentDate !== previousDate) {
      groups.push([])
      previousDate = currentDate
    }

    groups.at(-1)?.push(timeBox)
  })

  return groups.map((group) => sortTimeBoxesByStart(group, 'asc'))
}

export const findProjectName = (projects: NamedEntity[], projectId: string) => {
  return projects.find((project) => project.id === projectId)?.name ?? ''
}

export const findProject = (projects: Project[], projectId: string) => {
  return projects.find((project) => project.id === projectId) ?? null
}

export const findTagNames = (tags: NamedEntity[], tagIds: string[]) => {
  return tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name)
}
