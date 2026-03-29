// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import HomeActivityTimeline from '~/app/components/HomeActivityTimeline.vue'
import type { HomeActivityWeek } from '~~/shared/worklog'

const weeks: HomeActivityWeek[] = [
  {
    weekStart: new Date('2026-03-02T12:00:00.000Z'),
    weekEnd: new Date('2026-03-08T12:00:00.000Z'),
    totalMinutes: 240,
    sessionCount: 2,
    hasActivity: true,
    isCurrentWeek: false,
    monthBoundaryOffsetDays: 6,
  },
  {
    weekStart: new Date('2026-03-09T12:00:00.000Z'),
    weekEnd: new Date('2026-03-15T12:00:00.000Z'),
    totalMinutes: 0,
    sessionCount: 0,
    hasActivity: false,
    isCurrentWeek: false,
    monthBoundaryOffsetDays: null,
  },
  {
    weekStart: new Date('2026-03-16T12:00:00.000Z'),
    weekEnd: new Date('2026-03-22T12:00:00.000Z'),
    totalMinutes: 480,
    sessionCount: 3,
    hasActivity: true,
    isCurrentWeek: true,
    monthBoundaryOffsetDays: null,
  },
]

describe('HomeActivityTimeline', () => {
  it('renders weekly bars, endpoint labels, and current-week state', () => {
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
    expect(wrapper.text()).toContain('Today')

    const bars = wrapper.findAll('[data-home-activity-week]')
    const monthDividers = wrapper.findAll('[data-home-activity-month-divider]')

    expect(bars).toHaveLength(3)
    expect(monthDividers).toHaveLength(1)
    expect(monthDividers[0]!.attributes('style')).toContain('85.71428571428571%')
    expect(bars[1]!.attributes('data-home-activity-empty')).toBe('true')
    expect(bars[2]!.attributes('data-home-activity-current')).toBe('true')
  })

  it('renders a subdued empty state when no weeks exist and not loading', () => {
    const wrapper = mount(HomeActivityTimeline, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        weeks: [],
        loading: false,
      },
    })

    expect(wrapper.text()).toContain('No activity yet')
    expect(wrapper.findAll('[data-home-activity-week]')).toHaveLength(0)
    expect(wrapper.findAll('[data-home-activity-month-divider]')).toHaveLength(0)
  })

  it('shows a loading skeleton instead of the empty copy while loading', () => {
    const wrapper = mount(HomeActivityTimeline, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        weeks: [],
        loading: true,
      },
    })

    expect(wrapper.text()).not.toContain('No activity yet')
    expect(wrapper.find('[data-home-activity-loading]').exists()).toBe(true)
    expect(wrapper.findAll('[data-home-activity-week]')).toHaveLength(0)
    expect(wrapper.findAll('[data-home-activity-month-divider]')).toHaveLength(0)
  })
})
