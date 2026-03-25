// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import SessionsYearView from '~/app/components/SessionsYearView.vue'
import type { YearHeatmapMonth } from '~~/shared/worklog'

const months: YearHeatmapMonth[] = [
  {
    year: 2026,
    monthIndex: 2,
    label: 'March',
    weeks: [
      [
        null,
        {
          date: new Date('2026-03-02T12:00:00.000Z'),
          hours: 2,
          inactive: false,
          intensity: 3,
          isToday: false,
          sessionCount: 1,
        },
        null,
        null,
        null,
        null,
        null,
      ],
    ],
  },
]

describe('SessionsYearView', () => {
  it('renders heatmap months and emits openDay when an active cell is clicked', async () => {
    const wrapper = mount(SessionsYearView, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        months,
      },
    })

    expect(wrapper.text()).toContain('March')

    await wrapper.get('button[aria-label*="Monday, March 2, 2026"]').trigger('click')

    expect(wrapper.emitted('openDay')).toEqual([[new Date('2026-03-02T12:00:00.000Z')]])
  })
})
