// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import ReportSnapshotView from '~/app/components/ReportSnapshotView.vue'
import type { ReportSnapshot } from '~~/shared/worklog'

const snapshot: ReportSnapshot = {
  generatedAtIso: '2026-03-23T18:00:00.000Z',
  rangeStartDateKey: '2026-03-01',
  rangeEndDateKey: '2026-03-23',
  rangeLabel: 'Mar 1, 2026 - Mar 23, 2026',
  overview: {
    totalMinutes: 240,
    totalHours: 4,
    sessionCount: 2,
    activeDayCount: 2,
    averageMinutesPerActiveDay: 120,
    averageSessionMinutes: 120,
    busiestDayDateKey: '2026-03-21',
    busiestDayLabel: 'Mar 21, 2026',
    busiestDayMinutes: 180,
    longestSessionId: 'session-2',
    longestSessionMinutes: 180,
    longestSessionProjectName: 'Client Portal',
    firstLoggedDayDateKey: '2026-03-20',
    firstLoggedDayLabel: 'Mar 20, 2026',
    lastLoggedDayDateKey: '2026-03-21',
    lastLoggedDayLabel: 'Mar 21, 2026',
    contextSwitchCount: 1,
    metrics: [
      {
        label: 'Hours logged',
        value: '4.0',
      },
      {
        label: 'Average session',
        value: '2.0',
      },
    ],
  },
  insights: [
    {
      id: 'busiest-day',
      label: 'Busiest day',
      value: 'Mar 21, 2026',
    },
    {
      id: 'top-tag',
      label: 'Top tag',
      value: 'Planning',
    },
  ],
  projectBreakdown: [
    {
      id: 'project-1',
      label: 'Client Portal',
      minutes: 240,
      percentageOfTotal: 100,
      sessionCount: 2,
    },
  ],
  tagBreakdown: [
    {
      id: 'tag-1',
      label: 'Planning',
      minutes: 240,
      percentageOfTotal: 100,
      sessionCount: 2,
    },
  ],
  projectTagMatrix: {
    columns: [
      {
        tagId: 'tag-1',
        tagName: 'Planning',
      },
    ],
    rows: [
      {
        projectId: 'project-1',
        projectName: 'Client Portal',
        minutes: 240,
        cells: [
          {
            tagId: 'tag-1',
            minutes: 240,
          },
        ],
      },
    ],
  },
  dailyRollups: [
    {
      dateKey: '2026-03-21',
      label: 'Mar 21, 2026',
      minutes: 180,
      sessionCount: 1,
    },
  ],
  weeklyRollups: [
    {
      weekStartDateKey: '2026-03-16',
      label: 'Mar 16, 2026',
      minutes: 240,
      sessionCount: 2,
    },
  ],
  sessionGroups: [
    {
      dateKey: '2026-03-21',
      label: 'Mar 21, 2026',
      sessionCount: 2,
      totalMinutes: 240,
      sessions: [
        {
          sessionId: 'session-1',
          projectId: 'project-1',
          projectName: 'Client Portal',
          tagIds: ['tag-1'],
          tagNames: ['Planning'],
          notes: 'Planning and review',
          durationMinutes: 60,
          startTimeIso: '2026-03-21T15:00:00.000Z',
          endTimeIso: '2026-03-21T16:00:00.000Z',
          clampedStartTimeIso: '2026-03-21T15:00:00.000Z',
          clampedEndTimeIso: '2026-03-21T16:00:00.000Z',
        },
      ],
    },
  ],
}

describe('ReportSnapshotView', () => {
  it('renders the report sections for editor and public report use cases', () => {
    const wrapper = mount(ReportSnapshotView, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        publishedAtIso: '2026-03-23T18:00:00.000Z',
        snapshot,
        summary: 'Client-ready summary',
        title: 'March Client Report',
      },
    })

    expect(wrapper.text()).toContain('March Client Report')
    expect(wrapper.text()).toContain('Highlights')
    expect(wrapper.text()).toContain('Hours by project')
    expect(wrapper.text()).toContain('Session detail')
    expect(wrapper.text()).toContain('Planning and review')
  })

  it('hides tag-only sections when tags are disabled', () => {
    const wrapper = mount(ReportSnapshotView, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        hideTags: true,
        publicMode: true,
        snapshot,
        title: 'March Client Report',
      },
    })

    expect(wrapper.text()).toContain('Client report')
    expect(wrapper.text()).not.toContain('Hours by tag')
    expect(wrapper.text()).not.toContain('Project by tag matrix')
    expect(wrapper.text()).not.toContain('Top tag')
  })
})
