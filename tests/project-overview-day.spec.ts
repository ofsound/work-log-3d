// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, defineComponent } from 'vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectOverviewDay from '~/app/components/ProjectOverviewDay.vue'
;(globalThis as typeof globalThis & { computed?: typeof computed }).computed = computed

const TimeBoxStub = defineComponent({
  props: {
    compact: { type: Boolean, default: false },
    compactRowOpensEditor: { type: Boolean, default: false },
    id: { type: String, required: true },
    showCompactActions: { type: Boolean, default: false },
    variant: { type: String, default: '' },
  },
  template: `
    <div
      data-testid="project-overview-timebox"
      :data-compact="String(compact)"
      :data-edit-on-row="String(compactRowOpensEditor)"
      :data-id="id"
      :data-show-actions="String(showCompactActions)"
      :data-variant="variant"
    />
  `,
})

describe('ProjectOverviewDay', () => {
  it('renders compact project rows with inline edit affordances', () => {
    const wrapper = mount(ProjectOverviewDay, {
      props: {
        projectColors: {
          primary: '#123456',
          secondary: '#abcdef',
        },
        projectOverviewDayData: [
          {
            id: 'session-1',
            startTime: new Date('2026-03-23T16:00:00.000Z'),
            endTime: new Date('2026-03-23T17:00:00.000Z'),
            notes: 'Deep work',
            project: 'project-1',
            tags: [],
          },
          {
            id: 'session-2',
            startTime: new Date('2026-03-23T18:00:00.000Z'),
            endTime: new Date('2026-03-23T19:00:00.000Z'),
            notes: 'Review',
            project: 'project-1',
            tags: [],
          },
        ],
      },
      global: {
        components: {
          ContainerCard,
        },
        stubs: {
          DurationPill: true,
          TimeBox: TimeBoxStub,
        },
      },
    })

    const rows = wrapper.findAll('[data-testid="project-overview-timebox"]')

    expect(rows).toHaveLength(2)
    expect(rows[0]!.attributes('data-variant')).toBe('project')
    expect(rows[0]!.attributes('data-compact')).toBe('true')
    expect(rows[0]!.attributes('data-show-actions')).toBe('true')
    expect(rows[0]!.attributes('data-edit-on-row')).toBe('true')
  })
})
