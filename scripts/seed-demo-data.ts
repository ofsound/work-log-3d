import { createNamedEntityPayload, validateTimeBoxInput } from '../shared/worklog/validation'

import type { TimeBoxInput } from '../shared/worklog/types'

export const DEMO_SEED_EMAIL = 'seeds@modernthings.net'
export const DEFAULT_DEMO_SEED = 240321
export const SESSION_DURATIONS = [30, 45, 60, 90, 120] as const

const DAILY_DURATION_TEMPLATES = [
  [60, 90, 45],
  [45, 60, 90, 45],
  [60, 45, 60, 90],
  [90, 60, 45, 30],
  [60, 120, 45],
  [45, 60, 45, 90, 30],
  [120, 60, 45, 60],
  [60, 90, 120],
  [90, 45, 60, 45, 60],
  [120, 90, 60],
] as const

type ProjectBlueprint = {
  key: string
  name: string
  deliverables: readonly string[]
  concerns: readonly string[]
  collaborators: readonly string[]
}

type TagBlueprint = {
  key: string
  name: string
  phrase: string
}

export interface DemoSeedEntity {
  key: string
  name: string
  slug: string
}

export interface DemoSeedSession {
  startTime: Date
  endTime: Date
  notes: string
  projectKey: string
  tagKeys: string[]
}

export interface DemoSeedDataset {
  projects: DemoSeedEntity[]
  tags: DemoSeedEntity[]
  sessions: DemoSeedSession[]
}

export interface BuildDemoSeedDatasetOptions {
  endDate?: Date
  seed?: number
}

export interface DemoSeedTimeBoxContext {
  projectIdByKey: Record<string, string>
  tagIdByKey: Record<string, string>
}

const projectBlueprints: readonly ProjectBlueprint[] = [
  {
    key: 'client-portal',
    name: 'Client Portal Revamp',
    deliverables: ['account settings flow', 'project summary cards', 'handoff checklist'],
    concerns: ['edge-case validation', 'empty states', 'follow-up polish'],
    collaborators: ['support', 'the product team', 'customer success'],
  },
  {
    key: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    deliverables: ['usage trend charts', 'saved filters', 'export summaries'],
    concerns: ['data mapping', 'query cleanup', 'loading behavior'],
    collaborators: ['ops', 'finance', 'the reporting lead'],
  },
  {
    key: 'billing-cleanup',
    name: 'Billing Cleanup',
    deliverables: ['invoice retry flow', 'credit note handling', 'plan change checks'],
    concerns: ['error handling', 'copy updates', 'regression cleanup'],
    collaborators: ['finance', 'support', 'the billing owner'],
  },
  {
    key: 'mobile-polish',
    name: 'Mobile Polish',
    deliverables: ['responsive header', 'session forms', 'navigation spacing'],
    concerns: ['tap targets', 'layout drift', 'device-specific fixes'],
    collaborators: ['design', 'qa', 'the frontend team'],
  },
  {
    key: 'onboarding',
    name: 'Onboarding Improvements',
    deliverables: ['first-run checklist', 'welcome prompts', 'activation reminders'],
    concerns: ['drop-off points', 'copy clarity', 'step ordering'],
    collaborators: ['growth', 'support', 'the onboarding owner'],
  },
  {
    key: 'design-system',
    name: 'Design System Polish',
    deliverables: ['button states', 'form field variants', 'token cleanup'],
    concerns: ['visual consistency', 'component drift', 'accessibility passes'],
    collaborators: ['design', 'frontend', 'the docs lead'],
  },
  {
    key: 'sales-ops',
    name: 'Sales Ops Enablement',
    deliverables: ['deal board tweaks', 'pipeline summaries', 'handoff notes'],
    concerns: ['field naming', 'report accuracy', 'workflow cleanup'],
    collaborators: ['sales', 'ops', 'the revops lead'],
  },
  {
    key: 'internal-tools',
    name: 'Internal Tools Refresh',
    deliverables: ['queue filters', 'bulk actions', 'status rollups'],
    concerns: ['small papercuts', 'admin usability', 'slow paths'],
    collaborators: ['ops', 'support', 'the internal tools owner'],
  },
  {
    key: 'docs-rewrite',
    name: 'Docs Rewrite',
    deliverables: ['setup guide', 'release notes', 'support playbooks'],
    concerns: ['missing examples', 'navigation clarity', 'stale instructions'],
    collaborators: ['support', 'qa', 'the docs owner'],
  },
  {
    key: 'support-queue',
    name: 'Support Queue Triage',
    deliverables: ['repro notes', 'priority buckets', 'customer follow-ups'],
    concerns: ['bug reproduction', 'handoff detail', 'next-step clarity'],
    collaborators: ['support', 'engineering', 'the incident lead'],
  },
]

const tagBlueprints: readonly TagBlueprint[] = [
  { key: 'focus-work', name: 'Focus Work', phrase: 'heads-down implementation' },
  { key: 'planning', name: 'Planning', phrase: 'scoping and sequencing' },
  { key: 'review', name: 'Review', phrase: 'review and QA follow-through' },
  { key: 'bug-fix', name: 'Bug Fix', phrase: 'bug fixing and cleanup' },
  { key: 'coordination', name: 'Coordination', phrase: 'handoffs and team coordination' },
]

const morningStartSlots = [0, 15, 30, 45, 60, 75, 90]
const shortGaps = [15, 30, 45]
const middayGaps = [30, 45, 60]
const projectPatternsBySessionCount: Record<number, number[][]> = {
  3: [
    [0, 1, 0],
    [0, 1, 2],
    [0, 0, 1],
  ],
  4: [
    [0, 1, 0, 2],
    [0, 0, 1, 2],
    [0, 1, 2, 1],
  ],
  5: [
    [0, 1, 0, 2, 1],
    [0, 0, 1, 2, 1],
    [0, 1, 2, 1, 0],
  ],
}

const hourLabels = [
  { maxHour: 10, label: 'Morning' },
  { maxHour: 13, label: 'Late morning' },
  { maxHour: 16, label: 'Afternoon' },
]

const createRng = (seed: number) => {
  let current = seed >>> 0

  return () => {
    current += 0x6d2b79f5
    let temp = current
    temp = Math.imul(temp ^ (temp >>> 15), temp | 1)
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), temp | 61)
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296
  }
}

const randomInt = (rng: () => number, maxExclusive: number) => Math.floor(rng() * maxExclusive)

const randomItem = <T>(items: readonly T[], rng: () => number) =>
  items[randomInt(rng, items.length)]

const shuffle = <T>(items: readonly T[], rng: () => number) => {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, index + 1)
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, value: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + value)

const addMinutes = (date: Date, value: number) => new Date(date.getTime() + value * 60_000)

const formatLocalDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getWindowLabel = (date: Date) =>
  hourLabels.find((entry) => date.getHours() < entry.maxHour)?.label ?? 'Late afternoon'

const buildEntity = (name: string, label: string, key: string): DemoSeedEntity => ({
  key,
  ...createNamedEntityPayload(name, label),
})

const buildProjectCycle = (rng: () => number, minimumLength: number) => {
  const cycle: ProjectBlueprint[] = []

  while (cycle.length < minimumLength) {
    cycle.push(...shuffle(projectBlueprints, rng))
  }

  return cycle
}

const takeUniqueProjects = (
  cycle: ProjectBlueprint[],
  count: number,
  offsetRef: { current: number },
) => {
  const selected: ProjectBlueprint[] = []
  const seen = new Set<string>()

  while (selected.length < count) {
    const project = cycle[offsetRef.current % cycle.length]
    offsetRef.current += 1

    if (seen.has(project.key)) {
      continue
    }

    seen.add(project.key)
    selected.push(project)
  }

  return selected
}

const pickTagKeys = (durationMinutes: number, rng: () => number) => {
  const tagKeys = new Set<string>()
  const modeRoll = rng()

  if (durationMinutes >= 90) {
    tagKeys.add('focus-work')
  } else if (modeRoll < 0.22) {
    tagKeys.add('planning')
  } else if (modeRoll < 0.44) {
    tagKeys.add('review')
  } else if (modeRoll < 0.66) {
    tagKeys.add('bug-fix')
  } else {
    tagKeys.add('coordination')
  }

  if (rng() < 0.45 || tagKeys.has('planning')) {
    const secondaryOptions = tagBlueprints
      .map((tag) => tag.key)
      .filter((tagKey) => !tagKeys.has(tagKey) && (tagKey !== 'planning' || durationMinutes <= 60))
    tagKeys.add(randomItem(secondaryOptions, rng))
  }

  return [...tagKeys]
}

const buildNotes = ({
  startTime,
  durationMinutes,
  project,
  tags,
  rng,
}: {
  startTime: Date
  durationMinutes: number
  project: ProjectBlueprint
  tags: TagBlueprint[]
  rng: () => number
}) => {
  const windowLabel = getWindowLabel(startTime)
  const deliverable = randomItem(project.deliverables, rng)
  const concern = randomItem(project.concerns, rng)
  const collaborator = randomItem(project.collaborators, rng)
  const tagSummary =
    tags.length === 1 ? tags[0].phrase : `${tags[0].phrase} with a short pass on ${tags[1].phrase}`
  const wrapUp = randomItem(
    [
      'left the next step queued up for the next block',
      'captured a few follow-up notes before stopping',
      'closed out with a quick pass on loose edges',
      'made sure the handoff would be easy to pick back up',
    ],
    rng,
  )

  return `${windowLabel} block on ${project.name} focused on ${deliverable}. I spent ${durationMinutes} minutes mostly on ${concern}, kept the work moving with ${tagSummary}, and synced the latest context for ${collaborator}. Before wrapping, I ${wrapUp}.`
}

const buildDaySchedule = (day: Date, durations: readonly number[], rng: () => number) => {
  const firstOffset = randomItem(morningStartSlots, rng)
  let cursor = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 15 + firstOffset)

  return durations.map((durationMinutes, index) => {
    const startTime = cursor
    const endTime = addMinutes(startTime, durationMinutes)

    if (index < durations.length - 1) {
      const gapChoices =
        index === 1 && durations.length >= 4
          ? middayGaps
          : index === durations.length - 2
            ? shortGaps
            : [...shortGaps, 60]
      cursor = addMinutes(endTime, randomItem(gapChoices, rng))
    }

    return { startTime, endTime, durationMinutes }
  })
}

export const getUserWorklogCollectionPaths = (uid: string) => [
  `users/${uid}/timeBoxes`,
  `users/${uid}/projects`,
  `users/${uid}/tags`,
]

export const groupDemoSessionsByDay = (sessions: DemoSeedSession[]) => {
  const groups = new Map<string, DemoSeedSession[]>()

  sessions.forEach((session) => {
    const key = formatLocalDayKey(session.startTime)
    const daySessions = groups.get(key) ?? []
    daySessions.push(session)
    groups.set(key, daySessions)
  })

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, daySessions]) => ({
      day,
      sessions: daySessions.sort(
        (left, right) => left.startTime.getTime() - right.startTime.getTime(),
      ),
    }))
}

export const buildDemoSeedDataset = ({
  endDate = new Date(),
  seed = DEFAULT_DEMO_SEED,
}: BuildDemoSeedDatasetOptions = {}): DemoSeedDataset => {
  const rng = createRng(seed)
  const normalizedEndDate = startOfLocalDay(endDate)
  const startDate = addDays(normalizedEndDate, -13)
  const sessions: DemoSeedSession[] = []
  const cycle = buildProjectCycle(rng, 64)
  const cycleOffset = { current: 0 }
  const tagByKey = Object.fromEntries(tagBlueprints.map((tag) => [tag.key, tag])) as Record<
    string,
    TagBlueprint
  >

  const assertUniqueSlugs = (entities: DemoSeedEntity[], label: string) => {
    const seen = new Set<string>()

    entities.forEach((entity) => {
      if (seen.has(entity.slug)) {
        throw new Error(`Demo seed has duplicate ${label} slug: ${entity.slug}`)
      }

      seen.add(entity.slug)
    })
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = addDays(startDate, dayOffset)
    const durations = randomItem(DAILY_DURATION_TEMPLATES, rng)
    const schedule = buildDaySchedule(day, durations, rng)
    const pattern = randomItem(projectPatternsBySessionCount[durations.length], rng)
    const uniqueProjects = takeUniqueProjects(cycle, Math.max(...pattern) + 1, cycleOffset)

    schedule.forEach(({ startTime, endTime, durationMinutes }, sessionIndex) => {
      const project = uniqueProjects[pattern[sessionIndex]]
      const tagKeys = pickTagKeys(durationMinutes, rng)
      const tags = tagKeys.map((tagKey) => tagByKey[tagKey])

      sessions.push({
        startTime,
        endTime,
        notes: buildNotes({ startTime, durationMinutes, project, tags, rng }),
        projectKey: project.key,
        tagKeys,
      })
    })
  }

  const projects = projectBlueprints.map((project) =>
    buildEntity(project.name, 'Project', project.key),
  )
  const tags = tagBlueprints.map((tag) => buildEntity(tag.name, 'Tag', tag.key))

  assertUniqueSlugs(projects, 'project')
  assertUniqueSlugs(tags, 'tag')

  return {
    projects,
    tags,
    sessions,
  }
}

export const materializeDemoTimeBoxes = (
  sessions: DemoSeedSession[],
  { projectIdByKey, tagIdByKey }: DemoSeedTimeBoxContext,
): TimeBoxInput[] =>
  sessions.map((session) =>
    validateTimeBoxInput({
      startTime: session.startTime,
      endTime: session.endTime,
      notes: session.notes,
      project: projectIdByKey[session.projectKey],
      tags: session.tagKeys.map((tagKey) => tagIdByKey[tagKey]),
    }),
  )
