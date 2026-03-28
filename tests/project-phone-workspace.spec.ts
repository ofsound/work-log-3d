// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectPhoneWorkspace from '~/app/components/ProjectPhoneWorkspace.vue'

const ProjectOverviewDayStub = defineComponent({
  props: {
    projectColors: { type: Object, default: null },
    projectOverviewDayData: { type: Array, default: () => [] },
  },
  template: `
    <div
      data-testid="project-phone-group"
      :data-count="String(projectOverviewDayData.length)"
      :data-secondary="projectColors?.secondary ?? ''"
    />
  `,
})

describe('ProjectPhoneWorkspace', () => {
  it('renders grouped project days through ProjectOverviewDay', () => {
    const wrapper = mount(ProjectPhoneWorkspace, {
      props: {
        groupedTimeBoxes: [
          [
            {
              id: 'session-1',
              startTime: new Date('2026-03-23T16:00:00.000Z'),
              endTime: new Date('2026-03-23T17:00:00.000Z'),
              notes: 'Deep work',
              project: 'project-1',
              tags: [],
            },
          ],
          [
            {
              id: 'session-2',
              startTime: new Date('2026-03-22T16:00:00.000Z'),
              endTime: new Date('2026-03-22T17:00:00.000Z'),
              notes: 'Planning',
              project: 'project-1',
              tags: [],
            },
            {
              id: 'session-3',
              startTime: new Date('2026-03-22T18:00:00.000Z'),
              endTime: new Date('2026-03-22T19:00:00.000Z'),
              notes: 'Docs',
              project: 'project-1',
              tags: [],
            },
          ],
        ],
        project: {
          id: 'project-1',
          name: 'Client Portal',
          slug: 'client-portal',
          notes: '',
          colors: {
            primary: '#123456',
            secondary: '#abcdef',
          },
        },
      },
      global: {
        components: {
          ContainerCard,
        },
        stubs: {
          ProjectOverviewDay: ProjectOverviewDayStub,
        },
      },
    })

    const groups = wrapper.findAll('[data-testid="project-phone-group"]')

    expect(groups).toHaveLength(2)
    expect(groups[0]!.attributes('data-count')).toBe('1')
    expect(groups[1]!.attributes('data-count')).toBe('2')
    expect(groups[0]!.attributes('data-secondary')).toBe('#abcdef')
  })

  it('shows the empty state when the project has no sessions', () => {
    const wrapper = mount(ProjectPhoneWorkspace, {
      props: {
        groupedTimeBoxes: [],
        project: null,
      },
      global: {
        components: {
          ContainerCard,
        },
        stubs: {
          ProjectOverviewDay: ProjectOverviewDayStub,
        },
      },
    })

    expect(wrapper.text()).toContain('This project has no sessions yet.')
    expect(wrapper.findAll('[data-testid="project-phone-group"]')).toHaveLength(0)
  })
})
