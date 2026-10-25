// @vitest-environment jsdom

import { mount, type VueWrapper } from '@vue/test-utils'

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
        ContainerCard,
        WorkspaceSidePanelFrame,
      },
      stubs: {
        DailyScratchpadPanel: true,
        DaySummaryHeader: true,
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
  it.each(['scratchpad', 'overview'] as const)(
    'shows the day and scratchpad together in %s mode without a section switch',
    (mode) => {
      const wrapper = mountSidePanel(mode)
      expect(wrapper.findComponent({ name: 'DaySessionsOverviewPanel' }).exists()).toBe(true)
      expect(wrapper.find('[data-testid="daily-scratchpad-footer"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Day sidebar sections"]').exists()).toBe(false)
      expect(wrapper.findAll('button')).toHaveLength(0)
      const viewport = wrapper.get('.overflow-y-auto.overscroll-contain')
      expect(viewport.find('[data-testid="daily-scratchpad-footer"]').exists()).toBe(false)
      wrapper.unmount()
    },
  )

  it('keeps notes mounted behind the session takeover and restores them on return', async () => {
    const wrapper = mountSidePanel('scratchpad')
    const note = wrapper.getComponent({ name: 'DailyScratchpadPanel' }).vm
    await wrapper.setProps({ mode: 'session' })
    expect(wrapper.getComponent({ name: 'DailyScratchpadPanel' }).vm).toBe(note)
    expect(wrapper.findComponent({ name: 'TimeBox' }).exists()).toBe(true)
    expect(wrapper.get('[data-testid="daily-scratchpad-footer"]').isVisible()).toBe(false)
    await getButtonByLabel(wrapper, 'Back to day').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[]])
    await wrapper.setProps({ mode: 'overview' })
    expect(
      wrapper.get('[data-testid="daily-scratchpad-footer"]').attributes('style'),
    ).not.toContain('display: none')
    expect(wrapper.getComponent({ name: 'DailyScratchpadPanel' }).vm).toBe(note)
    wrapper.unmount()
  })

  it('lets New Session take over the sidebar without tabs or a visible scratchpad', async () => {
    const wrapper = mountSidePanel('scratchpad')
    const note = wrapper.getComponent({ name: 'DailyScratchpadPanel' }).vm
    await wrapper.setProps({ mode: 'create' })
    expect(wrapper.get('[data-testid="daily-scratchpad-footer"]').isVisible()).toBe(false)
    expect(wrapper.getComponent({ name: 'DailyScratchpadPanel' }).vm).toBe(note)
    expect(wrapper.findComponent({ name: 'DaySessionsOverviewPanel' }).exists()).toBe(false)
    expect(wrapper.text()).toContain('New Session')
    expect(wrapper.find('[aria-label="Day sidebar sections"]').exists()).toBe(false)
    await wrapper.get('[aria-label="Cancel new session"]').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[]])
    await wrapper.setProps({ mode: 'scratchpad' })
    expect(
      wrapper.get('[data-testid="daily-scratchpad-footer"]').attributes('style'),
    ).not.toContain('display: none')
    wrapper.unmount()
  })

  it('passes the panel thin editor context in create mode', () => {
    const wrapper = mountSidePanel('create')
    const editor = wrapper.get('[data-testid="timebox-editor"]')

    expect(editor.attributes('data-surface')).toBe('panel')
    expect(editor.attributes('data-layout')).toBe('thin')
  })
})
