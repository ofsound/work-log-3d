// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'

const route = reactive({
  query: {
    mode: 'day',
    date: '2026-03-23',
  },
})

const routerReplace = vi.fn(async ({ query }: { query: Record<string, unknown> }) => {
  route.query = query as typeof route.query
})

const mediaMatches = ref(true)
const updateTimeBox = vi.fn()
const createTimeBox = vi.fn()
const ensureDailyNote = vi.fn()
const upsertDailyNote = vi.fn()
const useCollectionCall = { count: 0 }
const flushScratchpad = vi.fn().mockResolvedValue(undefined)

const timeBoxDocuments = [
  {
    id: 'session-1',
    startTime: { toDate: () => new Date('2026-03-23T16:00:00.000Z') },
    endTime: { toDate: () => new Date('2026-03-23T17:00:00.000Z') },
    notes: 'Deep work',
    project: 'project-1',
    tags: [],
  },
]

const projectDocuments = [
  {
    id: 'project-1',
    name: 'Client Portal',
    slug: 'client-portal',
    notes: '',
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
  },
]

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useCollection: () => {
    useCollectionCall.count += 1

    if (useCollectionCall.count === 1 || useCollectionCall.count === 4) {
      return ref(timeBoxDocuments)
    }

    if (useCollectionCall.count === 2) {
      return ref(projectDocuments)
    }

    return ref([])
  },
  useFirestoreCollections: () => ({
    timeBoxesCollection: ref({ id: 'timeBoxes' }),
    projectsCollection: ref({ id: 'projects' }),
    tagsCollection: ref({ id: 'tags' }),
  }),
  useMediaQuery: () => mediaMatches,
  useRoute: () => route,
  useRouter: () => ({
    replace: routerReplace,
  }),
  useUserSettings: () => ({
    hideTags: ref(false),
  }),
  useWorklogRepository: () => ({
    timeBoxes: {
      create: createTimeBox,
      update: updateTimeBox,
      remove: vi.fn(),
    },
    dailyNotes: {
      ensure: ensureDailyNote,
      upsert: upsertDailyNote,
    },
    projects: {} as never,
    tags: {} as never,
    reports: {} as never,
  }),
}

const SessionsWorkspaceShellStub = defineComponent({
  setup(_props, { slots }) {
    return () =>
      h('div', { 'data-test': 'workspace-shell' }, [
        h('div', slots.default?.()),
        h('div', slots.aside?.()),
      ])
  },
})

const SessionsDayViewStub = defineComponent({
  emits: ['openSession', 'openScratchpad', 'createSession'],
  setup(_props, { emit }) {
    return () =>
      h('div', { 'data-test': 'day-view' }, [
        h('button', {
          'data-test': 'open-session',
          onClick: () => emit('openSession', 'session-1'),
        }),
        h('button', { 'data-test': 'open-scratchpad', onClick: () => emit('openScratchpad') }),
        h('button', {
          'data-test': 'create-session',
          onClick: () =>
            emit('createSession', {
              startTime: new Date('2026-03-23T16:00:00.000Z'),
              endTime: new Date('2026-03-23T17:00:00.000Z'),
            }),
        }),
      ])
  },
})

const SessionsSidePanelStub = defineComponent({
  props: {
    dateKey: { type: String, default: '' },
    mode: { type: String, required: true },
    persistent: { type: Boolean, default: false },
    sessionId: { type: String, default: '' },
  },
  emits: ['close', 'created', 'openSession', 'showOverview', 'showScratchpad'],
  setup(props, { emit, expose }) {
    expose({
      flushScratchpad,
    })

    return () =>
      h(
        'div',
        {
          'data-test': 'side-panel',
          'data-date-key': props.dateKey,
          'data-mode': props.mode,
          'data-persistent': String(props.persistent),
          'data-session-id': props.sessionId,
        },
        [
          h('button', { 'data-test': 'tab-scratchpad', onClick: () => emit('showScratchpad') }),
          h('button', { 'data-test': 'tab-overview', onClick: () => emit('showOverview') }),
          h('button', {
            'data-test': 'open-overview-session',
            onClick: () => emit('openSession', 'session-1'),
          }),
        ],
      )
  },
})

const flushPendingWork = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('vuefire', () => ({
  useCollection: () => {
    useCollectionCall.count += 1

    if (useCollectionCall.count === 1 || useCollectionCall.count === 4) {
      return ref(timeBoxDocuments)
    }

    if (useCollectionCall.count === 2) {
      return ref(projectDocuments)
    }

    return ref([])
  },
}))

vi.mock('~/composables/useFirestoreCollections', () => ({
  useFirestoreCollections: () => ({
    timeBoxesCollection: ref({ id: 'timeBoxes' }),
    projectsCollection: ref({ id: 'projects' }),
    tagsCollection: ref({ id: 'tags' }),
  }),
}))

vi.mock('~/composables/useMediaQuery', () => ({
  useMediaQuery: () => mediaMatches,
}))

vi.mock('~/composables/useUserSettings', () => ({
  useUserSettings: () => ({
    hideTags: ref(false),
  }),
}))

vi.mock('~/composables/useWorklogRepository', () => ({
  useWorklogRepository: () => ({
    timeBoxes: {
      create: createTimeBox,
      update: updateTimeBox,
      remove: vi.fn(),
    },
    dailyNotes: {
      ensure: ensureDailyNote,
      upsert: upsertDailyNote,
    },
    projects: {} as never,
    tags: {} as never,
    reports: {} as never,
  }),
}))

const { default: SessionsPage } = await import('~/app/pages/sessions.vue')

describe('sessions day scratchpad', () => {
  beforeEach(() => {
    route.query = {
      mode: 'day',
      date: '2026-03-23',
    }
    routerReplace.mockClear()
    mediaMatches.value = true
    useCollectionCall.count = 0
    flushScratchpad.mockClear()
    createTimeBox.mockReset()
    createTimeBox.mockResolvedValue('session-2')
    updateTimeBox.mockReset()
    updateTimeBox.mockResolvedValue(undefined)
    ensureDailyNote.mockReset()
    ensureDailyNote.mockResolvedValue(undefined)
    upsertDailyNote.mockReset()
    upsertDailyNote.mockResolvedValue(undefined)
  })

  it('defaults to the scratchpad sidebar on desktop Day view', async () => {
    const wrapper = mount(SessionsPage, {
      global: {
        stubs: {
          SessionListFilterPanel: true,
          SessionsDayView: SessionsDayViewStub,
          SessionsMonthView: true,
          SessionsSidePanel: SessionsSidePanelStub,
          SessionsWeekView: true,
          SessionsWorkspaceShell: SessionsWorkspaceShellStub,
          SessionsYearView: true,
          TimeBox: true,
        },
      },
    })

    await flushPendingWork()

    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('scratchpad')
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-persistent')).toBe('true')
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-date-key')).toBe('2026-03-23')
  })

  it('switches to overview, opens a session from it, and can switch back to scratchpad', async () => {
    const wrapper = mount(SessionsPage, {
      global: {
        stubs: {
          SessionListFilterPanel: true,
          SessionsDayView: SessionsDayViewStub,
          SessionsMonthView: true,
          SessionsSidePanel: SessionsSidePanelStub,
          SessionsWeekView: true,
          SessionsWorkspaceShell: SessionsWorkspaceShellStub,
          SessionsYearView: true,
          TimeBox: true,
        },
      },
    })

    await flushPendingWork()
    await wrapper.get('[data-test="tab-overview"]').trigger('click')
    await flushPendingWork()

    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('overview')

    await wrapper.get('[data-test="open-overview-session"]').trigger('click')
    await flushPendingWork()

    expect(flushScratchpad).toHaveBeenCalled()
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('session')
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-session-id')).toBe('session-1')

    await wrapper.get('[data-test="tab-scratchpad"]').trigger('click')
    await flushPendingWork()

    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('scratchpad')
  })

  it('returns to the remembered overview tab on Escape and after day navigation', async () => {
    const wrapper = mount(SessionsPage, {
      global: {
        stubs: {
          SessionListFilterPanel: true,
          SessionsDayView: SessionsDayViewStub,
          SessionsMonthView: true,
          SessionsSidePanel: SessionsSidePanelStub,
          SessionsWeekView: true,
          SessionsWorkspaceShell: SessionsWorkspaceShellStub,
          SessionsYearView: true,
          TimeBox: true,
        },
      },
    })

    await flushPendingWork()
    await wrapper.get('[data-test="tab-overview"]').trigger('click')
    await flushPendingWork()
    await wrapper.get('[data-test="open-overview-session"]').trigger('click')
    await flushPendingWork()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPendingWork()

    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('overview')

    const nextButton = wrapper.findAll('button').find((button) => button.text() === 'Next')

    expect(nextButton).toBeDefined()
    await nextButton!.trigger('click')
    await flushPendingWork()

    expect(routerReplace).toHaveBeenCalled()
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-date-key')).toBe('2026-03-24')
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('overview')
  })

  it('omits the scratchpad on narrow screens but keeps existing session panel behavior', async () => {
    mediaMatches.value = false

    const wrapper = mount(SessionsPage, {
      global: {
        stubs: {
          SessionListFilterPanel: true,
          SessionsDayView: SessionsDayViewStub,
          SessionsMonthView: true,
          SessionsSidePanel: SessionsSidePanelStub,
          SessionsWeekView: true,
          SessionsWorkspaceShell: SessionsWorkspaceShellStub,
          SessionsYearView: true,
          TimeBox: true,
        },
      },
    })

    await flushPendingWork()

    expect(wrapper.find('[data-test="side-panel"]').exists()).toBe(false)

    await wrapper.get('[data-test="open-session"]').trigger('click')
    await flushPendingWork()

    expect(wrapper.get('[data-test="side-panel"]').attributes('data-mode')).toBe('session')
    expect(wrapper.get('[data-test="side-panel"]').attributes('data-persistent')).toBe('false')
  })
})
