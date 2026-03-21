import { describe, expect, it } from 'vitest'

import {
  buildDemoSeedDataset,
  DEFAULT_DEMO_SEED,
  getUserWorklogCollectionPaths,
  groupDemoSessionsByDay,
  materializeDemoTimeBoxes,
  SESSION_DURATIONS,
} from '../scripts/seed-demo-data'

const buildFixedDataset = () =>
  buildDemoSeedDataset({
    endDate: new Date(2026, 2, 21, 12, 0, 0, 0),
    seed: DEFAULT_DEMO_SEED,
  })

describe('demo seed dataset', () => {
  it('builds the requested projects, tags, and 14-day range', () => {
    const dataset = buildFixedDataset()
    const groupedDays = groupDemoSessionsByDay(dataset.sessions)
    const uniqueProjects = new Set(dataset.sessions.map((session) => session.projectKey))

    expect(dataset.projects).toHaveLength(10)
    expect(dataset.tags).toHaveLength(5)
    expect(groupedDays).toHaveLength(14)
    expect(groupedDays[0]?.day).toBe('2026-03-08')
    expect(groupedDays.at(-1)?.day).toBe('2026-03-21')
    expect(uniqueProjects.size).toBe(10)
  })

  it('materializes valid non-overlapping timeboxes with believable daily totals', () => {
    const dataset = buildFixedDataset()
    const projectIdByKey = Object.fromEntries(
      dataset.projects.map((project) => [project.key, `project-${project.key}`]),
    )
    const tagIdByKey = Object.fromEntries(dataset.tags.map((tag) => [tag.key, `tag-${tag.key}`]))
    const timeBoxes = materializeDemoTimeBoxes(dataset.sessions, {
      projectIdByKey,
      tagIdByKey,
    })

    timeBoxes.forEach((timeBox) => {
      const durationMinutes = (timeBox.endTime.getTime() - timeBox.startTime.getTime()) / 60_000

      expect(SESSION_DURATIONS).toContain(durationMinutes)
      expect(timeBox.tags.length).toBeGreaterThanOrEqual(1)
      expect(timeBox.tags.length).toBeLessThanOrEqual(2)
      expect(timeBox.notes.length).toBeGreaterThan(120)
    })

    groupDemoSessionsByDay(dataset.sessions).forEach(({ sessions }) => {
      const totalMinutes = sessions.reduce(
        (sum, session) => sum + (session.endTime.getTime() - session.startTime.getTime()) / 60_000,
        0,
      )

      expect(sessions.length).toBeGreaterThanOrEqual(3)
      expect(sessions.length).toBeLessThanOrEqual(5)
      expect(totalMinutes).toBeGreaterThanOrEqual(180)
      expect(totalMinutes).toBeLessThanOrEqual(360)

      sessions.forEach((session, index) => {
        if (index === 0) {
          return
        }

        expect(session.startTime.getTime()).toBeGreaterThanOrEqual(
          sessions[index - 1]!.endTime.getTime(),
        )
      })
    })
  })

  it('resets only the targeted user subtree in the correct order', () => {
    expect(getUserWorklogCollectionPaths('seed-user-1')).toEqual([
      'users/seed-user-1/timeBoxes',
      'users/seed-user-1/projects',
      'users/seed-user-1/tags',
    ])
  })
})
