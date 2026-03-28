// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'

import ContainerCard from '~/app/components/ContainerCard.vue'
import TimeBoxViewer from '~/app/components/TimeBoxViewer.vue'

const projectsCollection = ref({ id: 'projects' })
const tagsCollection = ref({ id: 'tags' })
const timeBoxesCollection = ref({ id: 'timeBoxes' })

const confirm = vi.fn()
const removeTimeBox = vi.fn()

const projectDocuments = ref([
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
])
const timeBoxDocument = ref({
  id: 'session-1',
  startTime: new Date('2026-03-23T16:00:00.000Z'),
  endTime: new Date('2026-03-23T17:15:00.000Z'),
  notes: 'Deep work',
  project: 'project-1',
  tags: [],
})

;(globalThis as { __nuxtTestMocks?: Record<string, unknown> }).__nuxtTestMocks = {
  useFirestoreCollections: () => ({
    projectsCollection,
    tagsCollection,
    timeBoxesCollection,
  }),
}
;(globalThis as typeof globalThis & { computed?: typeof computed }).computed = computed
;(globalThis as typeof globalThis & { ref?: typeof ref }).ref = ref
;(
  globalThis as typeof globalThis & {
    useCollection?: (source: { value?: { id?: string } } | { id?: string } | null) => unknown
  }
).useCollection = (source: { value?: { id?: string } } | { id?: string } | null) => {
  const resolved = source && 'value' in source ? source.value : source

  if (resolved?.id === 'projects') {
    return projectDocuments
  }

  return ref([])
}
;(
  globalThis as typeof globalThis & {
    useDocument?: () => typeof timeBoxDocument
  }
).useDocument = () => timeBoxDocument
;(
  globalThis as typeof globalThis & {
    useFirestoreCollections?: () => {
      projectsCollection: typeof projectsCollection
      tagsCollection: typeof tagsCollection
      timeBoxesCollection: typeof timeBoxesCollection
    }
  }
).useFirestoreCollections = () => ({
  projectsCollection,
  tagsCollection,
  timeBoxesCollection,
})
;(
  globalThis as typeof globalThis & {
    useConfirmDialog?: () => { confirm: typeof confirm }
  }
).useConfirmDialog = () => ({
  confirm,
})
;(
  globalThis as typeof globalThis & {
    useUserSettings?: () => { hideTags: ReturnType<typeof ref> }
  }
).useUserSettings = () => ({
  hideTags: ref(false),
})
;(
  globalThis as typeof globalThis & {
    useWorklogRepository?: () => {
      timeBoxes: {
        create: ReturnType<typeof vi.fn>
        remove: typeof removeTimeBox
        update: ReturnType<typeof vi.fn>
      }
    }
  }
).useWorklogRepository = () => ({
  timeBoxes: {
    create: vi.fn(),
    remove: removeTimeBox,
    update: vi.fn(),
  },
})

vi.mock('firebase/firestore', () => ({
  doc: (_collection: unknown, id: string) => ({
    id,
  }),
}))

vi.mock('~/utils/worklog-firebase', () => ({
  toProjects: (projects: unknown[] | undefined) => projects ?? [],
  toTags: (tags: unknown[] | undefined) => tags ?? [],
  toTimeBox: (timeBox: unknown) => timeBox,
}))

const { default: TimeBox } = await import('~/app/components/TimeBox.vue')

const mountCompactTimeBox = () =>
  mount(TimeBox, {
    props: {
      compact: true,
      compactRowOpensEditor: true,
      id: 'session-1',
      showCompactActions: true,
      variant: 'project',
    },
    global: {
      components: {
        ContainerCard,
        TimeBoxViewer,
      },
      stubs: {
        DurationPill: {
          props: ['minutes'],
          template: '<span data-testid="duration-pill">{{ minutes }}</span>',
        },
        HighlightedText: {
          props: ['text'],
          template: '<span>{{ text }}</span>',
        },
        NuxtLink: {
          template: '<a><slot /></a>',
        },
        TimeBoxEditor: {
          template: '<div data-testid="timebox-editor">Editor</div>',
        },
      },
    },
  })

describe('TimeBox compact project actions', () => {
  beforeEach(() => {
    confirm.mockReset()
    confirm.mockResolvedValue(true)
    removeTimeBox.mockReset()
    removeTimeBox.mockResolvedValue(undefined)
  })

  it('renders compact edit and delete actions', () => {
    const wrapper = mountCompactTimeBox()

    expect(wrapper.get('button[aria-label="Edit session"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-label="Delete session"]').exists()).toBe(true)
  })

  it('opens the inline editor from row click', async () => {
    const wrapper = mountCompactTimeBox()
    const row = wrapper.get('[role="button"]')

    await row.trigger('click')

    expect(wrapper.find('[data-testid="timebox-editor"]').exists()).toBe(true)
  })

  it('opens the inline editor from keyboard activation', async () => {
    const wrapper = mountCompactTimeBox()
    const row = wrapper.get('[role="button"]')

    await row.trigger('keydown', { key: ' ' })

    expect(wrapper.find('[data-testid="timebox-editor"]').exists()).toBe(true)
  })

  it('deletes without opening the inline editor', async () => {
    const wrapper = mountCompactTimeBox()

    await wrapper.get('button[aria-label="Delete session"]').trigger('click')

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(removeTimeBox).toHaveBeenCalledWith('session-1')
    expect(wrapper.find('[data-testid="timebox-editor"]').exists()).toBe(false)
  })
})
