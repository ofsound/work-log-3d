// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import SessionsPhoneWorkspace from '~/app/components/SessionsPhoneWorkspace.vue'

import type { SessionListFilters, TimeBox } from '~~/shared/worklog'

const AppButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})

const DaySessionsOverviewPanelStub = defineComponent({
  props: {
    timeBoxes: { type: Array, default: () => [] },
  },
  template: '<div data-testid="day-overview" :data-count="String(timeBoxes.length)" />',
})

const buildTimeBox = (id: string, startTime: Date, endTime: Date): TimeBox => ({
  id,
  endTime,
  notes: '',
  project: 'project-1',
  startTime,
  tags: [],
})

const baseFilters: SessionListFilters = {
  dateEnd: '',
  dateStart: '',
  maxMinutes: null,
  minMinutes: null,
  notesState: 'any',
  projectIds: [],
  query: '',
  tagIds: [],
  tagMode: 'any',
  untaggedOnly: false,
}

const mountWorkspace = (
  overrides: Partial<InstanceType<typeof SessionsPhoneWorkspace>['$props']> = {},
) => {
  const onAddSession = vi.fn()

  const wrapper = mount(SessionsPhoneWorkspace, {
    props: {
      anchorDate: new Date('2026-03-23T12:00:00.000Z'),
      calendarHeaderSummary: null,
      currentMode: 'day',
      filteredSessionListTimeBoxes: [],
      hideTags: false,
      initialEndTime: '',
      initialStartTime: '',
      listFilters: baseFilters,
      listSearchTokens: [],
      listSummary: {
        count: 0,
        durationLabel: '0h',
        projectCount: 0,
      },
      mutationErrorMessage: '',
      onAddSession,
      onBackToOverview: () => {},
      onClearFilters: () => {},
      onClosePanel: () => {},
      onCreated: () => {},
      onGoToday: () => {},
      onNavigatePeriod: () => {},
      onOpenSession: () => {},
      onSelectMode: () => {},
      onShowOverview: () => {},
      onShowScratchpad: () => {},
      onUpdateFilters: () => {},
      pageTitle: 'Monday, March 23, 2026',
      panelMode: 'closed',
      panelSessionId: '',
      projectById: {},
      projectNameById: {},
      scratchpadDateKey: '2026-03-23',
      selectedSessionId: '',
      sessionViewItems: [{ id: 'day', label: 'Day' }],
      sortedTags: [],
      visibleDayTimeBoxes: [],
      ...overrides,
    },
    global: {
      stubs: {
        AppButton: AppButtonStub,
        ContainerCard: {
          template: '<div data-testid="container-card"><slot /></div>',
        },
        DaySessionsOverviewPanel: DaySessionsOverviewPanelStub,
        SessionListFilterPanel: true,
        SessionsSidePanel: true,
        SessionsWorkspaceHeader: true,
        SessionsWorkspaceShell: {
          template: '<div><slot /><slot name="aside" /></div>',
        },
        TimeBox: true,
        WorkspaceSidePanelFrame: true,
      },
    },
  })

  return { onAddSession, wrapper }
}

describe('SessionsPhoneWorkspace', () => {
  it('renders Add Session below the day list and calls the create callback', async () => {
    const { onAddSession, wrapper } = mountWorkspace({
      visibleDayTimeBoxes: [
        buildTimeBox(
          'session-1',
          new Date('2026-03-23T16:00:00.000Z'),
          new Date('2026-03-23T17:00:00.000Z'),
        ),
      ],
    })

    expect(wrapper.get('[data-testid="day-overview"]').attributes('data-count')).toBe('1')
    expect(wrapper.text()).toContain('Add Session')

    await wrapper.get('button').trigger('click')

    expect(onAddSession).toHaveBeenCalledTimes(1)
  })

  it('renders the empty-state Add Session CTA when the day has no sessions', async () => {
    const { onAddSession, wrapper } = mountWorkspace()

    expect(wrapper.text()).toContain('No sessions on the selected day.')
    expect(wrapper.text()).toContain('Add Session')
    expect(wrapper.find('[data-testid="day-overview"]').exists()).toBe(false)

    await wrapper.get('button').trigger('click')

    expect(onAddSession).toHaveBeenCalledTimes(1)
  })
})
