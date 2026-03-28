// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils'

import AppSegmentedControl from '~/app/components/AppSegmentedControl.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import SessionsSidePanel from '~/app/components/SessionsSidePanel.vue'
import WorkspaceSidePanelFrame from '~/app/components/WorkspaceSidePanelFrame.vue'

type SessionsSidePanelMode = 'scratchpad' | 'overview' | 'session' | 'create'

const mountSidePanel = (mode: SessionsSidePanelMode) =>
  mount(SessionsSidePanel, {
    props: {
      dateKey: '2026-03-23',
      day: new Date('2026-03-23T12:00:00.000Z'),
      mode,
      persistent: true,
      sessionId: 'session-1',
    },
    global: {
      components: {
        AppSegmentedControl,
        ContainerCard,
        WorkspaceSidePanelFrame,
      },
      stubs: {
        DailyScratchpadPanel: true,
        DaySessionsOverviewPanel: true,
        TimeBox: true,
        TimeBoxEditor: {
          props: ['layout', 'surface'],
          template:
            '<div data-testid="timebox-editor" :data-layout="layout" :data-surface="surface">Editor</div>',
        },
      },
    },
  })

const getButtonByLabel = (wrapper: VueWrapper, label: string) => {
  const match = wrapper.findAll('button').find((button) => button.text() === label)

  if (!match) {
    throw new Error(`Missing button with label "${label}"`)
  }

  return match
}

describe('SessionsSidePanel', () => {
  it('renders persistent scratchpad and overview controls and emits the same tab events', async () => {
    const wrapper = mountSidePanel('overview')
    const scratchpadButton = getButtonByLabel(wrapper, 'Scratchpad')
    const overviewButton = getButtonByLabel(wrapper, 'Overview')

    expect(wrapper.text()).toContain('Scratchpad')
    expect(wrapper.text()).toContain('Overview')
    expect(wrapper.text()).not.toContain('Session')
    expect(wrapper.text()).not.toContain('New Session')

    await scratchpadButton.trigger('click')
    await overviewButton.trigger('click')

    expect(wrapper.emitted('showScratchpad')).toEqual([[]])
    expect(wrapper.emitted('showOverview')).toEqual([[]])
  })

  it('shows Session only in session mode', () => {
    const wrapper = mountSidePanel('session')
    const labels = wrapper.findAll('button').map((button) => button.text())

    expect(labels).toEqual(['Scratchpad', 'Overview', 'Session'])
  })

  it('shows New Session in create mode', () => {
    const wrapper = mountSidePanel('create')
    const labels = wrapper.findAll('button').map((button) => button.text())

    expect(labels).toEqual(['Scratchpad', 'Overview', 'New Session'])
  })

  it('passes the panel thin editor context in create mode', () => {
    const wrapper = mountSidePanel('create')
    const editor = wrapper.get('[data-testid="timebox-editor"]')

    expect(editor.attributes('data-surface')).toBe('panel')
    expect(editor.attributes('data-layout')).toBe('thin')
  })
})
