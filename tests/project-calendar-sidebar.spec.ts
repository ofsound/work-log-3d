// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectCalendarSidebar from '~/app/components/ProjectCalendarSidebar.vue'
import WorkspaceSidePanelFrame from '~/app/components/WorkspaceSidePanelFrame.vue'

const DaySessionsOverviewPanelStub = defineComponent({
  emits: ['openSession'],
  template: `
    <div data-test="overview-panel">
      <button type="button" data-test="open-overview-session" @click="$emit('openSession', 'session-2')">
        Open overview session
      </button>
    </div>
  `,
})

const mountSidebar = (props: Record<string, unknown>) =>
  mount(ProjectCalendarSidebar, {
    props: {
      day: new Date(2026, 2, 23, 12, 0, 0),
      mode: 'day',
      timeBoxes: [],
      ...props,
    },
    global: {
      components: {
        ContainerCard,
        WorkspaceSidePanelFrame,
      },
      stubs: {
        DaySessionsOverviewPanel: DaySessionsOverviewPanelStub,
        TimeBox: {
          template: '<div data-test="time-box">TimeBox</div>',
        },
      },
    },
  })

describe('ProjectCalendarSidebar', () => {
  it('renders the day overview inside the shared frame and forwards open-session', async () => {
    const wrapper = mountSidebar({})

    expect(wrapper.find('[data-test="overview-panel"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Close"]').exists()).toBe(true)

    await wrapper.find('[data-test="open-overview-session"]').trigger('click')

    expect(wrapper.emitted('openSession')).toEqual([['session-2']])
  })

  it('renders the session subheader and keeps back/close controls working', async () => {
    const day = new Date(2026, 2, 23, 12, 0, 0)
    const expectedTitle = day.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const wrapper = mountSidebar({
      day,
      mode: 'session',
      sessionId: 'session-1',
    })

    expect(wrapper.text()).toContain('Session')
    expect(wrapper.text()).toContain(expectedTitle)
    expect(wrapper.find('[data-test="time-box"]').exists()).toBe(true)

    await wrapper.find('button').trigger('click')
    await wrapper.find('button[aria-label="Close"]').trigger('click')

    expect(wrapper.emitted('backToDay')).toEqual([[]])
    expect(wrapper.emitted('close')).toEqual([[]])
  })
})
