// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'
import DaySessionsOverviewPanel from '~/app/components/DaySessionsOverviewPanel.vue'

const TimeBoxStub = defineComponent({
  props: {
    id: { type: String, required: true },
  },
  emits: ['open'],
  template:
    '<button data-testid="overview-row" type="button" @click="$emit(\'open\')">{{ id }}</button>',
})

describe('DaySessionsOverviewPanel', () => {
  it('shows mixed-project details and emits the clicked session id', async () => {
    const wrapper = mount(DaySessionsOverviewPanel, {
      global: {
        components: {
          ContainerCard,
          TimeBox: TimeBoxStub,
        },
      },
      props: {
        day: new Date('2026-03-23T12:00:00.000Z'),
        projectById: {
          projectA: {
            id: 'projectA',
            name: 'Client Portal',
            slug: 'client-portal',
            notes: '',
            colors: {
              primary: '#123456',
              secondary: '#abcdef',
            },
          },
          projectB: {
            id: 'projectB',
            name: 'Marketing Site',
            slug: 'marketing-site',
            notes: '',
            colors: {
              primary: '#654321',
              secondary: '#fedcba',
            },
          },
        },
        projectNameById: {
          projectA: 'Client Portal',
          projectB: 'Marketing Site',
        },
        showProjectName: true,
        timeBoxes: [
          {
            id: 'session-1',
            startTime: new Date('2026-03-23T16:00:00.000Z'),
            endTime: new Date('2026-03-23T17:00:00.000Z'),
            notes: 'Deep work',
            project: 'projectA',
            tags: [],
          },
          {
            id: 'session-2',
            startTime: new Date('2026-03-23T18:00:00.000Z'),
            endTime: new Date('2026-03-23T19:30:00.000Z'),
            notes: '',
            project: 'projectB',
            tags: [],
          },
        ],
        useProjectCardStyles: true,
      },
    })

    expect(wrapper.find('[data-testid="day-summary"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="overview-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('session-1')
    expect(wrapper.text()).toContain('session-2')

    await wrapper.findAll('[data-testid="overview-row"]')[0]!.trigger('click')

    expect(wrapper.emitted('openSession')).toEqual([['session-1']])
  })

  it('hides the day summary block when showDaySummary is false', () => {
    const wrapper = mount(DaySessionsOverviewPanel, {
      global: {
        components: {
          ContainerCard,
          TimeBox: TimeBoxStub,
        },
      },
      props: {
        day: new Date('2026-03-23T12:00:00.000Z'),
        showDaySummary: false,
        timeBoxes: [
          {
            id: 'session-1',
            startTime: new Date('2026-03-23T16:00:00.000Z'),
            endTime: new Date('2026-03-23T17:00:00.000Z'),
            notes: 'Deep work',
            project: 'projectA',
            tags: [],
          },
        ],
      },
    })

    expect(wrapper.find('[data-testid="day-summary"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('session-1')
  })

  it('renders the configured empty-state copy', () => {
    const wrapper = mount(DaySessionsOverviewPanel, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        day: new Date('2026-03-23T12:00:00.000Z'),
        emptyEyebrow: 'No entries',
        emptyMessage: 'Nothing was logged on this day.',
        timeBoxes: [],
      },
    })

    expect(wrapper.text()).toContain('No entries')
    expect(wrapper.text()).toContain('Nothing was logged on this day.')
  })
})
