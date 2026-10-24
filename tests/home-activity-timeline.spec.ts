// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import HomeActivityTimeline from '~/app/components/HomeActivityTimeline.vue'
import type { HomeActivityWeek } from '~~/shared/worklog'

const weeks: HomeActivityWeek[] = [
  {
    weekStart: new Date('2026-03-23T12:00:00.000Z'),
    weekEnd: new Date('2026-03-29T12:00:00.000Z'),
    totalMinutes: 240,
    sessionCount: 2,
    hasActivity: true,
    isCurrentWeek: false,
    monthBoundaryOffsetDays: null,
  },
  {
    weekStart: new Date('2026-03-30T12:00:00.000Z'),
    weekEnd: new Date('2026-04-05T12:00:00.000Z'),
    totalMinutes: 0,
    sessionCount: 0,
    hasActivity: false,
    isCurrentWeek: false,
    monthBoundaryOffsetDays: 2,
  },
  {
    weekStart: new Date('2026-04-06T12:00:00.000Z'),
    weekEnd: new Date('2026-04-12T12:00:00.000Z'),
    totalMinutes: 480,
    sessionCount: 3,
    hasActivity: true,
    isCurrentWeek: true,
    monthBoundaryOffsetDays: null,
  },
]

describe('HomeActivityTimeline', () => {
  it('renders weekly bars, small month labels, and current-week state', () => {
    const wrapper = mount(HomeActivityTimeline, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        weeks,
      },
    })

    expect(wrapper.attributes('data-home-activity-timeline')).toBeDefined()
    expect(wrapper.classes()).toContain('w-[80%]')
    expect(wrapper.text()).not.toContain('Today')
    expect(
      wrapper.findAll('[data-home-activity-month-label]').map((label) => label.text()),
    ).toEqual(['Mar', 'Apr'])

    const bars = wrapper.findAll('[data-home-activity-week]')
    const monthDividers = wrapper.findAll('[data-home-activity-month-divider]')

    expect(bars).toHaveLength(3)
    expect(monthDividers).toHaveLength(1)
    expect(monthDividers[0]!.attributes('style')).toContain('28.57142857142857%')
    expect(bars[1]!.attributes('data-home-activity-empty')).toBe('true')
    expect(bars[2]!.attributes('data-home-activity-current')).toBe('true')
  })

  it('renders a subdued empty state when no weeks exist', () => {
    const wrapper = mount(HomeActivityTimeline, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        weeks: [],
      },
    })

    expect(wrapper.text()).toContain('No activity yet')
    expect(wrapper.findAll('[data-home-activity-week]')).toHaveLength(0)
    expect(wrapper.findAll('[data-home-activity-month-divider]')).toHaveLength(0)
  })
})
