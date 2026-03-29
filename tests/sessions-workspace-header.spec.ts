// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import SessionsWorkspaceHeader from '~/app/components/SessionsWorkspaceHeader.vue'

const items = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'search', label: 'Search' },
] as const

const anchorDateFixture = new Date(2026, 0, 15)

describe('SessionsWorkspaceHeader', () => {
  it('renders calendar-mode summary badges and period navigation controls', () => {
    const wrapper = mount(SessionsWorkspaceHeader, {
      props: {
        anchorDate: anchorDateFixture,
        calendarHeaderSummary: {
          count: 8,
          durationLabel: '14.5',
          projectCount: 3,
        },
        currentMode: 'week',
        listSummary: {
          count: 12,
          durationLabel: '18.0',
          projectCount: 4,
        },
        pageTitle: 'March 24-30, 2026',
        sessionViewItems: items,
      },
      global: {
        stubs: {
          AppButton: {
            emits: ['click'],
            template: '<button data-test="app-button" @click="$emit(\'click\')"><slot /></button>',
          },
          AppSegmentedControl: {
            props: ['activeId', 'ariaLabel', 'items', 'size'],
            emits: ['select'],
            template:
              '<button data-test="segmented" :aria-label="ariaLabel" @click="$emit(\'select\', items[1].id)">{{ activeId }} / {{ size }}</button>',
          },
          CloseIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('March 24-30, 2026')
    expect(wrapper.text()).toContain('14.5 hrs')
    expect(wrapper.text()).toContain('8 sessions')
    expect(wrapper.text()).toContain('3 projects')
    expect(wrapper.get('[data-test="segmented"]').attributes('aria-label')).toBe(
      'Sessions view modes',
    )
    expect(wrapper.find('[aria-label="Previous period"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Next period"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Today')
  })

  it('renders search-mode summary, clear action, and hides period navigation', async () => {
    const wrapper = mount(SessionsWorkspaceHeader, {
      props: {
        anchorDate: anchorDateFixture,
        calendarHeaderSummary: null,
        currentMode: 'search',
        listSummary: {
          count: 6,
          durationLabel: '9.0',
          projectCount: 2,
        },
        mutationErrorMessage: 'Unable to save the session.',
        pageTitle: 'Sessions',
        sessionViewItems: items,
      },
      global: {
        stubs: {
          AppButton: {
            emits: ['click'],
            template: '<button data-test="app-button" @click="$emit(\'click\')"><slot /></button>',
          },
          AppSegmentedControl: {
            props: ['activeId', 'ariaLabel'],
            template: '<div data-test="segmented" :aria-label="ariaLabel">{{ activeId }}</div>',
          },
          CloseIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('9.0 hrs')
    expect(wrapper.text()).toContain('6 matches')
    expect(wrapper.text()).toContain('2 projects')
    expect(wrapper.text()).toContain('Clear all')
    expect(wrapper.text()).toContain('Unable to save the session.')
    expect(wrapper.find('[aria-label="Previous period"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Next period"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="nav-spacer"]').attributes('aria-hidden')).toBe('true')

    await wrapper.get('[data-test="app-button"]').trigger('click')

    expect(wrapper.emitted('clear-filters')).toEqual([[]])
  })

  it('renders year-mode summary badges without period navigation', () => {
    const wrapper = mount(SessionsWorkspaceHeader, {
      props: {
        anchorDate: anchorDateFixture,
        calendarHeaderSummary: {
          count: 56,
          durationLabel: '66.16',
          projectCount: 10,
        },
        currentMode: 'year',
        listSummary: {
          count: 0,
          durationLabel: '0.0',
          projectCount: 0,
        },
        pageTitle: '2025-2026',
        sessionViewItems: items,
      },
      global: {
        stubs: {
          AppButton: true,
          AppSegmentedControl: {
            props: ['activeId', 'ariaLabel'],
            template: '<div data-test="segmented" :aria-label="ariaLabel">{{ activeId }}</div>',
          },
          CloseIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('66.16 hrs')
    expect(wrapper.text()).toContain('56 sessions')
    expect(wrapper.text()).toContain('10 projects')
    expect(wrapper.find('[aria-label="Previous period"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Next period"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="nav-spacer"]').attributes('aria-hidden')).toBe('true')
  })

  it('in day+calendar mode, places duration beside compact title on narrow and full badges from sm', () => {
    const dayAnchor = new Date(2026, 2, 28)
    const wrapper = mount(SessionsWorkspaceHeader, {
      props: {
        anchorDate: dayAnchor,
        calendarHeaderSummary: {
          count: 1,
          durationLabel: '0.01',
          projectCount: 1,
        },
        currentMode: 'day',
        listSummary: {
          count: 1,
          durationLabel: '0.01',
          projectCount: 1,
        },
        pageTitle: 'Saturday, March 28, 2026',
        sessionViewItems: items,
      },
      global: {
        stubs: {
          AppButton: true,
          AppSegmentedControl: true,
          CloseIcon: true,
        },
      },
    })

    expect(wrapper.get('[data-testid="sessions-header-day-duration-inline"]').text()).toBe(
      '0.01 hrs',
    )
    expect(wrapper.text()).toContain('1 sessions')
    expect(wrapper.text()).toContain('1 projects')
  })

  it('emits selected mode ids through the typed facade', async () => {
    const dayAnchor = new Date(2026, 2, 28)
    const wrapper = mount(SessionsWorkspaceHeader, {
      props: {
        anchorDate: dayAnchor,
        calendarHeaderSummary: null,
        currentMode: 'day',
        listSummary: {
          count: 1,
          durationLabel: '1.0',
          projectCount: 1,
        },
        pageTitle: 'Saturday, March 28, 2026',
        sessionViewItems: items,
      },
      global: {
        stubs: {
          AppButton: true,
          AppSegmentedControl: {
            props: ['items'],
            emits: ['select'],
            template:
              '<button data-test="segmented" @click="$emit(\'select\', items[3].id)"></button>',
          },
          CloseIcon: true,
        },
      },
    })

    expect(wrapper.get('[data-testid="sessions-header-day-title-short"]').text()).toBe(
      'Sat 3/28/2026',
    )
    expect(wrapper.get('[data-testid="sessions-header-day-title-long"]').text()).toBe(
      'Saturday, March 28, 2026',
    )

    await wrapper.get('[data-test="segmented"]').trigger('click')

    expect(wrapper.emitted('select-mode')).toEqual([['year']])
  })
})
